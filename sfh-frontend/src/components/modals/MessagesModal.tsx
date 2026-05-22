import React, { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import UserAvatar from '@/components/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  Send,
  Search,
  Plus,
  ArrowLeft,
  Clock,
  Loader2,
} from 'lucide-react';
import {
  getConversations,
  createConversation,
  getConversationMessages,
  sendConversationMessage,
  markConversationRead,
  searchMessagingUsers,
} from '@/services/api';
import { useAuth, roleLabels, normalizeUserRole } from '@/contexts/AuthContext';

type ApiMessage = {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string; role?: string };
};

type ConvRow = {
  id: string;
  peer?: { id: string; name: string; role?: string; email?: string; profileImage?: string | null };
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
};

interface MessagesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MessagesModal: React.FC<MessagesModalProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeQuery, setComposeQuery] = useState('');
  const [composeResults, setComposeResults] = useState<
    Array<{ id: string; name: string; email: string; role: string; profileImage?: string | null }>
  >([]);
  const [composeLoading, setComposeLoading] = useState(false);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const raw = await getConversations();
      setConversations(Array.isArray(raw) ? raw : []);
    } catch {
      setConversations([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadThread = useCallback(async (conversationId: string) => {
    setLoadingThread(true);
    try {
      const raw = await getConversationMessages(conversationId);
      setMessages(Array.isArray(raw) ? raw : []);
      await markConversationRead(conversationId);
      await loadList();
    } catch {
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  }, [loadList]);

  useEffect(() => {
    if (!open) return;
    loadList();
    const t = window.setInterval(loadList, 12000);
    return () => window.clearInterval(t);
  }, [open, loadList]);

  useEffect(() => {
    if (!open || !selectedId) {
      setMessages([]);
      return;
    }
    loadThread(selectedId);
    const t = window.setInterval(() => loadThread(selectedId), 12000);
    return () => window.clearInterval(t);
  }, [open, selectedId, loadThread]);

  useEffect(() => {
    if (!composeOpen) {
      setComposeResults([]);
      setComposeQuery('');
      return;
    }
    const q = composeQuery.trim();
    if (q.length < 2) {
      setComposeResults([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      setComposeLoading(true);
      try {
        const raw = await searchMessagingUsers(q);
        setComposeResults(Array.isArray(raw) ? raw : []);
      } catch {
        setComposeResults([]);
      } finally {
        setComposeLoading(false);
      }
    }, 400);
    return () => window.clearTimeout(handle);
  }, [composeOpen, composeQuery]);

  const selected = conversations.find((c) => c.id === selectedId);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread || 0), 0);

  const filteredConversations = conversations.filter((c) =>
    (c.peer?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedId) return;
    setSending(true);
    try {
      await sendConversationMessage(selectedId, newMessage);
      setNewMessage('');
      await loadThread(selectedId);
      await loadList();
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  };

  const handlePickUser = async (userId: string) => {
    try {
      const conv = await createConversation(userId);
      setComposeOpen(false);
      setComposeQuery('');
      setComposeResults([]);
      await loadList();
      if (conv?.id) {
        setSelectedId(conv.id);
      }
    } catch {
      /* ignore */
    }
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[600px] p-0 overflow-hidden">
        <div className="flex h-full">
          <div
            className={cn(
              'w-full md:w-80 border-r flex flex-col',
              selectedId && 'hidden md:flex'
            )}
          >
            <DialogHeader className="p-4 border-b">
              <DialogTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Messages
                  {totalUnread > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {totalUnread}
                    </Badge>
                  )}
                </span>
                <Button size="icon" variant="ghost" onClick={() => setComposeOpen(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>

            {composeOpen && (
              <div className="p-3 border-b space-y-2 bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  Search by name, email, or role (type at least 2 characters).
                </p>
                <Input
                  placeholder="Search users..."
                  value={composeQuery}
                  onChange={(e) => setComposeQuery(e.target.value)}
                  autoFocus
                />
                {composeLoading ? (
                  <div className="flex justify-center py-2">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : composeQuery.trim().length >= 2 && composeResults.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">No matching users found.</p>
                ) : (
                  <ScrollArea className="max-h-44 pr-2">
                    <div className="space-y-1">
                      {composeResults.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-background border border-transparent hover:border-border text-left transition-colors"
                          onClick={() => handlePickUser(u.id)}
                        >
                          <UserAvatar
                            sizeClass="h-9 w-9"
                            user={{
                              id: u.id,
                              name: u.name,
                              email: u.email,
                              role: normalizeUserRole(u.role),
                              profileImage: u.profileImage || undefined,
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{u.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                            <Badge variant="outline" className="mt-1 text-[10px] h-5">
                              {roleLabels[normalizeUserRole(u.role)] || u.role}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
                <Button size="sm" variant="outline" className="w-full" onClick={() => setComposeOpen(false)}>
                  Close
                </Button>
              </div>
            )}

            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              {loadingList ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No conversations yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Use + to find a colleague by name or email.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setSelectedId(conversation.id)}
                      className={cn(
                        'w-full p-3 text-left hover:bg-muted/50 transition-colors',
                        selectedId === conversation.id && 'bg-muted'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <UserAvatar
                          sizeClass="h-10 w-10"
                          user={
                            conversation.peer
                              ? {
                                  id: conversation.peer.id,
                                  name: conversation.peer.name,
                                  email: conversation.peer.email || '',
                                  role: normalizeUserRole(conversation.peer.role),
                                  profileImage: conversation.peer.profileImage || undefined,
                                }
                              : undefined
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">{conversation.peer?.name || 'User'}</p>
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {conversation.lastMessageAt
                                ? new Date(conversation.lastMessageAt).toLocaleString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : ''}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {conversation.peer?.role
                              ? roleLabels[String(conversation.peer.role).toLowerCase() as keyof typeof roleLabels] ||
                                conversation.peer.role
                              : ''}
                          </p>
                          <p className="text-sm text-muted-foreground truncate mt-1">{conversation.lastMessage}</p>
                        </div>
                        {conversation.unread > 0 && (
                          <Badge variant="default" className="flex-shrink-0">
                            {conversation.unread}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className={cn('flex-1 flex flex-col', !selectedId && 'hidden md:flex')}>
            {selectedId && selected?.peer ? (
              <>
                <div className="p-4 border-b flex items-center gap-3">
                  <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setSelectedId(null)}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <UserAvatar
                    sizeClass="h-10 w-10"
                    user={
                      selected.peer
                        ? {
                            id: selected.peer.id,
                            name: selected.peer.name,
                            email: selected.peer.email || '',
                            role: normalizeUserRole(selected.peer.role),
                            profileImage: selected.peer.profileImage || undefined,
                          }
                        : undefined
                    }
                  />
                  <div>
                    <p className="font-medium text-sm">{selected.peer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selected.peer.role
                        ? roleLabels[String(selected.peer.role).toLowerCase() as keyof typeof roleLabels] ||
                          selected.peer.role
                        : ''}
                    </p>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                  {loadingThread ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const own = message.sender?.id === user?.id;
                        return (
                          <div
                            key={message.id}
                            className={cn('flex gap-2 items-end', own ? 'justify-end' : 'justify-start')}
                          >
                            {!own ? (
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {getInitials(message.sender?.name || '?')}
                                </AvatarFallback>
                              </Avatar>
                            ) : null}
                            <div
                              className={cn(
                                'max-w-[75%] rounded-2xl px-4 py-2',
                                own
                                  ? 'bg-primary text-primary-foreground rounded-br-md'
                                  : 'bg-muted rounded-bl-md'
                              )}
                            >
                              <p className="text-sm">{message.content}</p>
                              <div
                                className={cn(
                                  'flex items-center gap-1 mt-1 text-xs',
                                  own ? 'text-primary-foreground/70 justify-end' : 'text-muted-foreground'
                                )}
                              >
                                <Clock className="w-3 h-3" />
                                {message.createdAt
                                  ? new Date(message.createdAt).toLocaleString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : ''}
                              </div>
                            </div>
                            {own ? <UserAvatar sizeClass="h-8 w-8" className="flex-shrink-0 ring-2 ring-primary/30" /> : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim() || sending}>
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Select a conversation to view messages</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MessagesModal;
