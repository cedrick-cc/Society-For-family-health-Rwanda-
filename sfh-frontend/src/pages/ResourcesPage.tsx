import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Pencil, Trash2, AlertTriangle, Download, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PROGRAM_TYPE_LABELS, type ProgramTypeKey } from '@/lib/programResources';
import {
  getResources,
  createResource,
  updateResource,
  deleteResource,
  restockResource,
  downloadExport,
} from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/ui/empty-state';

type ResourceRow = {
  id: string;
  name: string;
  category: ProgramTypeKey;
  quantityAvailable: number;
  unit: string;
  lowStockThreshold: number;
};

const ResourcesPage: React.FC = () => {
  const [items, setItems] = useState<ResourceRow[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceRow | null>(null);
  const [form, setForm] = useState({
    name: '',
    category: 'HIV_AIDS_AWARENESS' as ProgramTypeKey,
    quantityAvailable: '0',
    unit: 'units',
    lowStockThreshold: '10',
  });
  const [restockId, setRestockId] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = categoryFilter !== 'all' ? { category: categoryFilter } : {};
      const data = await getResources(params);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const lowStockItems = useMemo(
    () => items.filter((r) => r.quantityAvailable <= r.lowStockThreshold),
    [items]
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        PROGRAM_TYPE_LABELS[r.category].toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      category: 'HIV_AIDS_AWARENESS',
      quantityAvailable: '0',
      unit: 'units',
      lowStockThreshold: '10',
    });
    setModalOpen(true);
  };

  const openEdit = (row: ResourceRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      category: row.category,
      quantityAvailable: String(row.quantityAvailable),
      unit: row.unit,
      lowStockThreshold: String(row.lowStockThreshold),
    });
    setModalOpen(true);
  };

  const save = async () => {
    try {
      const payload = {
        name: form.name,
        category: form.category,
        quantityAvailable: Number(form.quantityAvailable) || 0,
        unit: form.unit,
        lowStockThreshold: Number(form.lowStockThreshold) || 10,
      };
      if (editing) {
        await updateResource(editing.id, payload);
        toast({ title: 'Resource updated' });
      } else {
        await createResource(payload);
        toast({ title: 'Resource added' });
      }
      setModalOpen(false);
      load();
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Save failed',
        variant: 'destructive',
      });
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this resource?')) return;
    try {
      await deleteResource(id);
      toast({ title: 'Resource deleted' });
      load();
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Delete failed',
        variant: 'destructive',
      });
    }
  };

  const submitRestock = async () => {
    if (!restockId) return;
    try {
      await restockResource(restockId, Number(restockQty) || 0);
      toast({ title: 'Stock updated' });
      setRestockId(null);
      setRestockQty('');
      load();
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Restock failed',
        variant: 'destructive',
      });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <motion.div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Resource inventory</h1>
          <p className="text-muted-foreground mt-1">Central stock and low-stock monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => downloadExport('inventory', 'csv')}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add resource
          </Button>
        </div>
      </motion.div>

      {lowStockItems.length > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <motion.div>
              <p className="font-semibold text-sm">Low stock alerts ({lowStockItems.length})</p>
              <p className="text-sm text-muted-foreground mt-1">
                {lowStockItems.map((r) => r.name).join(', ')}
              </p>
            </motion.div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" /> Inventory
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search resources…"
                className="pl-8 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(Object.keys(PROGRAM_TYPE_LABELS) as ProgramTypeKey[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {PROGRAM_TYPE_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filteredItems.length === 0 ? (
            <EmptyState title="No resources match" description={items.length === 0 ? 'Add inventory items to allocate to programs.' : 'Try a different search or category.'} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Category</th>
                    <th className="pb-2 pr-4">Stock</th>
                    <th className="pb-2 pr-4">Threshold</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((r) => {
                    const low = r.quantityAvailable <= r.lowStockThreshold;
                    return (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">
                          {r.name}
                          {low && (
                            <Badge variant="outline" className="ml-2 text-warning border-warning/30">
                              Low
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 pr-4">{PROGRAM_TYPE_LABELS[r.category] || r.category}</td>
                        <td className="py-3 pr-4">
                          {r.quantityAvailable} {r.unit}
                        </td>
                        <td className="py-3 pr-4">{r.lowStockThreshold}</td>
                        <td className="py-3 flex flex-wrap gap-1">
                          <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setRestockId(r.id);
                              setRestockQty('');
                            }}
                          >
                            Restock
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit resource' : 'Add resource'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v as ProgramTypeKey }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROGRAM_TYPE_LABELS) as ProgramTypeKey[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {PROGRAM_TYPE_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <motion.div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={form.quantityAvailable}
                  onChange={(e) => setForm((f) => ({ ...f, quantityAvailable: e.target.value }))}
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
              </div>
            </motion.div>
            <div>
              <Label>Low stock threshold</Label>
              <Input
                type="number"
                value={form.lowStockThreshold}
                onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!restockId} onOpenChange={(o) => !o && setRestockId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restock inventory</DialogTitle>
          </DialogHeader>
          <Label>Quantity to add</Label>
          <Input type="number" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestockId(null)}>
              Cancel
            </Button>
            <Button onClick={submitRestock}>Add stock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default ResourcesPage;
