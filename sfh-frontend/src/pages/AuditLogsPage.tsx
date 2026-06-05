import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Info, AlertTriangle, ShieldAlert, Calendar as CalendarIcon, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { EmptyState } from '@/components/ui/empty-state';
import { fetchAuditLogs, AuditLog } from '@/lib/api';
import { downloadExport } from '@/services/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import type { DateRange } from 'react-day-picker';

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'info': return <Info className="w-4 h-4 text-info" />;
    case 'warning': return <AlertTriangle className="w-4 h-4 text-warning" />;
    case 'critical': return <ShieldAlert className="w-4 h-4 text-destructive" />;
    default: return null;
  }
};

const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [severity, setSeverity] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchAuditLogs().then((d) => setLogs(d as AuditLog[]));
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [severity, searchQuery, dateRange]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return logs.filter((l) => {
      if (severity !== 'all' && l.severity !== severity) return false;
      if (q && !`${l.user} ${l.action} ${l.details} ${l.module}`.toLowerCase().includes(q)) return false;
      if (dateRange?.from) {
        const ts = new Date(l.createdAt || l.timestamp);
        if (Number.isNaN(ts.getTime())) return false;
        const from = startOfDay(dateRange.from);
        const to = endOfDay(dateRange.to || dateRange.from);
        if (!isWithinInterval(ts, { start: from, end: to })) return false;
      }
      return true;
    });
  }, [logs, severity, searchQuery, dateRange]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const handleExport = async (fmt: 'csv' | 'pdf') => {
    setExporting(true);
    try {
      await downloadExport('audit', fmt);
      toast.success(`Audit logs exported as ${fmt.toUpperCase()}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">Track system activity and user actions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" disabled={exporting} onClick={() => handleExport('csv')}>
            <FileText className="w-4 h-4" />
            Export CSV
          </Button>
          <Button variant="outline" className="gap-2" disabled={exporting} onClick={() => handleExport('pdf')}>
            <FileText className="w-4 h-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <Card className="sfh-card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search user, action, details…"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? `${format(dateRange.from, 'LLL d')} - ${format(dateRange.to, 'LLL d, y')}` : format(dateRange.from, 'LLL d, y')
                ) : 'Date range'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} className={cn('p-3 pointer-events-auto')} />
            </PopoverContent>
          </Popover>
        </div>
      </Card>

      <Card className="sfh-card overflow-hidden">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={FileText} title="No audit logs match filters" description="Adjust search, severity, or date range." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-8" />
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/30">
                      <TableCell>{getSeverityIcon(log.severity)}</TableCell>
                      <TableCell className="text-sm font-mono">{log.timestamp}</TableCell>
                      <TableCell className="font-medium">{log.user}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn(
                          log.severity === 'critical' && 'bg-destructive/10 text-destructive',
                          log.severity === 'warning' && 'bg-warning/10 text-warning'
                        )}>{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{log.module}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{log.details}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4 border-t border-border bg-muted/20">
                <div className="text-sm text-muted-foreground">
                  Showing {Math.min(filtered.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filtered.length, currentPage * itemsPerPage)} of {filtered.length} records
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  {getPageNumbers().map((p) => (
                    <Button
                      key={p}
                      variant={currentPage === p ? 'default' : 'outline'}
                      size="sm"
                      className="w-9 h-9 p-0"
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AuditLogsPage;
