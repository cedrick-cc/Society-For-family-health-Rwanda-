const { PrismaClient } = require('@prisma/client');
const notificationService = require('./notificationService');

const prisma = new PrismaClient();

async function volunteerLinkedToFieldManager(volunteerId, fieldManagerId) {
  const count = await prisma.programVolunteer.count({
    where: {
      volunteerId,
      program: { fieldManagerId },
    },
  });
  return count > 0;
}

async function fieldManagerLinkedToVolunteer(fieldManagerId, volunteerId) {
  return volunteerLinkedToFieldManager(volunteerId, fieldManagerId);
}

async function canInitiateConversation(senderId, senderRole, peerId, peerRole) {
  if (senderId === peerId) return false;

  const peer = await prisma.user.findUnique({
    where: { id: peerId },
    select: { id: true, role: true, status: true },
  });
  if (!peer || peer.status !== 'ACTIVE') return false;

  if (senderRole === 'ADMIN') {
    return true;
  }

  if (senderRole === 'COORDINATOR') {
    return ['FIELD_MANAGER', 'VOLUNTEER', 'ADMIN'].includes(peer.role);
  }

  if (senderRole === 'FIELD_MANAGER') {
    if (peer.role === 'COORDINATOR' || peer.role === 'ADMIN') return true;
    if (peer.role === 'VOLUNTEER') {
      return fieldManagerLinkedToVolunteer(senderId, peerId);
    }
    return false;
  }

  if (senderRole === 'VOLUNTEER') {
    if (peer.role === 'COORDINATOR') return true;
    if (peer.role === 'FIELD_MANAGER') {
      return volunteerLinkedToFieldManager(senderId, peerId);
    }
    return false;
  }

  return false;
}

async function findExistingDirectConversation(userA, userB) {
  const shared = await prisma.conversationParticipant.findMany({
    where: { userId: userA },
    select: { conversationId: true },
  });
  const ids = shared.map((s) => s.conversationId);
  if (!ids.length) return null;

  const other = await prisma.conversationParticipant.findFirst({
    where: { conversationId: { in: ids }, userId: userB },
    select: { conversationId: true },
  });
  return other ? other.conversationId : null;
}

async function getOrCreateConversation(senderId, senderRole, peerId) {
  const peer = await prisma.user.findUnique({
    where: { id: peerId },
    select: { id: true, role: true, status: true, name: true },
  });
  if (!peer || peer.status !== 'ACTIVE') {
    const err = new Error('Recipient not found or inactive.');
    err.statusCode = 404;
    throw err;
  }

  const allowed = await canInitiateConversation(senderId, senderRole, peer.id, peer.role);
  if (!allowed) {
    const err = new Error('You are not allowed to start a conversation with this user.');
    err.statusCode = 403;
    throw err;
  }

  const existingId = await findExistingDirectConversation(senderId, peer.id);
  if (existingId) {
    return prisma.conversation.findUnique({
      where: { id: existingId },
      include: {
        participants: { include: { user: { select: { id: true, name: true, role: true, email: true, profileImage: true } } } },
      },
    });
  }

  const conv = await prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId: senderId }, { userId: peer.id }],
      },
    },
    include: {
      participants: { include: { user: { select: { id: true, name: true, role: true, email: true, profileImage: true } } } },
    },
  });

  return conv;
}

async function assertParticipant(conversationId, userId) {
  const row = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { userId: true },
  });
  if (!row) {
    const err = new Error('Conversation not found.');
    err.statusCode = 404;
    throw err;
  }
}

async function listConversations(userId) {
  const parts = await prisma.conversationParticipant.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          participants: { include: { user: { select: { id: true, name: true, role: true, email: true, profileImage: true } } } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { sender: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  const out = [];
  for (const p of parts) {
    const c = p.conversation;
    const peer = c.participants.map((x) => x.user).find((u) => u.id !== userId);
    const last = c.messages[0];
    const unread = await prisma.message.count({
      where: {
        conversationId: c.id,
        isRead: false,
        senderId: { not: userId },
      },
    });
    out.push({
      id: c.id,
      updatedAt: c.updatedAt,
      peer,
      lastMessage: last ? last.content : '',
      lastMessageAt: last ? last.createdAt : c.updatedAt,
      unread,
    });
  }

  out.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  return out;
}

async function listMessages(conversationId, userId) {
  await assertParticipant(conversationId, userId);
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    include: { sender: { select: { id: true, name: true, role: true } } },
    take: 200,
  });
}

async function sendMessage(conversationId, senderId, content) {
  await assertParticipant(conversationId, senderId);
  const text = String(content || '').trim();
  if (!text) throw new Error('Message content is required.');

  const msg = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      content: text,
      isRead: false,
    },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  const recipients = participants.map((x) => x.userId).filter((id) => id !== senderId);
  const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { name: true } });

  await notificationService.notifyMany(recipients, {
    type: 'NEW_MESSAGE',
    title: 'New message',
    body: `${sender?.name || 'Someone'}: ${text.slice(0, 120)}${text.length > 120 ? '…' : ''}`,
  });

  return msg;
}

async function markConversationRead(conversationId, readerId) {
  await assertParticipant(conversationId, readerId);
  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: readerId },
      isRead: false,
    },
    data: { isRead: true },
  });
  return { ok: true };
}

/** Total unread messages across all conversations for the user (incoming only). */
async function unreadMessagesTotal(userId) {
  const parts = await prisma.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true },
  });
  if (!parts.length) return 0;
  const ids = parts.map((p) => p.conversationId);
  return prisma.message.count({
    where: {
      conversationId: { in: ids },
      senderId: { not: userId },
      isRead: false,
    },
  });
}

/**
 * Search active users the sender is allowed to message (name / email / role).
 */
async function searchMessagingPeers(senderId, senderRole, query) {
  const q = String(query || '').trim();
  if (q.length < 2) return [];

  const roleTokens = ['ADMIN', 'COORDINATOR', 'FIELD_MANAGER', 'ANALYST', 'VOLUNTEER'];
  const upper = q.toUpperCase();
  const roleFilter = roleTokens.includes(upper) ? { role: upper } : null;

  const users = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      id: { not: senderId },
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        ...(roleFilter ? [roleFilter] : []),
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      profileImage: true,
    },
    take: 30,
    orderBy: { name: 'asc' },
  });

  const out = [];
  for (const u of users) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await canInitiateConversation(senderId, senderRole, u.id, u.role);
    if (ok) out.push(u);
  }
  return out.slice(0, 20);
}

module.exports = {
  canInitiateConversation,
  getOrCreateConversation,
  listConversations,
  listMessages,
  sendMessage,
  markConversationRead,
  unreadMessagesTotal,
  searchMessagingPeers,
};
