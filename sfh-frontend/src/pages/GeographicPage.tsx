import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import {
  MapPin,
  Filter,
  Layers,
  Navigation,
  Users,
  HeartHandshake,
  Calendar,
  Eye,
  ArrowUpRight,
  Wifi,
  WifiOff,
  Camera,
  FileText,
  Clock,
  CheckCircle2,
  Search,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import AddLocationModal from '@/components/modals/AddLocationModal';
import ProgramDetailsModal from '@/components/modals/ProgramDetailsModal';
import { toast } from '@/hooks/use-toast';
import { getPrograms } from '@/services/api';
import { mapApiProgramToUI } from '@/lib/entityMappers';
import type { Program } from '@/lib/api';
import type { ApiProgram } from '@/lib/entityMappers';
import { getLocationCoordinates, getCoverageRadiusMeters } from '@/lib/rwandaLocationCoordinates';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface OutreachLocation {
  id: string | number;
  name: string;
  type: string;
  location: string;
  district: string;
  sector?: string;
  lat: number;
  lng: number;
  status: 'planned' | 'ongoing' | 'completed';
  volunteers: number;
  beneficiaries: number;
  date: string;
  coverage: number;
}

function programToLocation(p: Program): OutreachLocation {
  const [lat, lng] = getLocationCoordinates(p.district, p.sector, String(p.id));
  return {
    id: p.id,
    name: p.name,
    type: p.type || 'Program',
    location: p.location,
    district: p.district,
    sector: p.sector,
    lat,
    lng,
    status: p.status,
    volunteers: p.assignedVolunteerCount ?? 0,
    beneficiaries: p.beneficiaries,
    date: p.startDate,
    coverage: p.progress,
  };
}

// Create custom icons
const createIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const statusColors: Record<string, string> = {
  ongoing: '#22c55e',
  planned: '#3b82f6',
  completed: '#f97316',
};

// Map center for Rwanda
const RWANDA_CENTER: [number, number] = [-1.9403, 29.8739];
const RWANDA_ZOOM = 8;

// Map center for Rwanda
const MAP_DEFAULTS = {
  center: [-1.9403, 29.8739] as [number, number],
  zoom: 8,
};

const GeographicPage: React.FC = () => {
  const [outreachLocations, setOutreachLocations] = useState<OutreachLocation[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState<OutreachLocation | null>(null);
  const [showCoverage, setShowCoverage] = useState(true);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const circlesRef = useRef<L.CircleMarker[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsProgramId, setDetailsProgramId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await getPrograms();
        if (cancelled) return;
        const list = Array.isArray(raw) ? raw : [];
        const mapped = list
          .map((row: unknown) => mapApiProgramToUI(row as ApiProgram))
          .map(programToLocation);
        setOutreachLocations(mapped);
      } catch {
        if (!cancelled) setOutreachLocations([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Create icons inside component to ensure proper initialization
  const statusIcons = useMemo(() => ({
    ongoing: createIcon('#22c55e'),
    planned: createIcon('#3b82f6'),
    completed: createIcon('#f97316'),
  }), []);

  const filteredLocations = useMemo(() => 
    outreachLocations.filter(
      (loc) => (statusFilter === 'all' || loc.status === statusFilter) &&
        (searchQuery === '' || loc.name.toLowerCase().includes(searchQuery.toLowerCase()) || loc.location.toLowerCase().includes(searchQuery.toLowerCase()))
    ), [outreachLocations, statusFilter, searchQuery]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView(
      MAP_DEFAULTS.center,
      MAP_DEFAULTS.zoom
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers, circles, and clusters
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing cluster group
    if (clusterGroupRef.current) {
      clusterGroupRef.current.clearLayers();
      map.removeLayer(clusterGroupRef.current);
    }

    // Clear existing circles
    circlesRef.current.forEach((circle) => circle.remove());
    circlesRef.current = [];

    // Add coverage circles
    if (showCoverage) {
      filteredLocations
        .filter((loc) => loc.status === 'ongoing' || loc.status === 'completed')
        .forEach((loc) => {
          const radius = getCoverageRadiusMeters(loc.sector);
          const circle = L.circle([loc.lat, loc.lng], {
            radius,
            fillColor: statusColors[loc.status],
            fillOpacity: 0.12,
            color: statusColors[loc.status],
            weight: 1,
            opacity: 0.35,
          }).addTo(map);
          circlesRef.current.push(circle);
        });
    }

    // Create cluster group
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: true,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        const size = count < 5 ? 'small' : count < 10 ? 'medium' : 'large';
        const sizeMap = { small: 36, medium: 44, large: 52 };
        const px = sizeMap[size];
        return L.divIcon({
          html: `<div style="
            width: ${px}px; height: ${px}px;
            background: hsl(222 72% 42%);
            border: 3px solid white;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: white; font-weight: 700; font-size: ${size === 'large' ? 14 : 12}px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          ">${count}</div>`,
          className: 'custom-cluster-icon',
          iconSize: L.point(px, px),
        });
      },
    });

    // Add markers with hover tooltips
    filteredLocations.forEach((loc) => {
      const marker = L.marker([loc.lat, loc.lng], {
        icon: statusIcons[loc.status],
      })
        .on('click', () => {
          setSelectedLocation(loc);
          map.setView([loc.lat, loc.lng], 12);
        });

      // Add hover tooltip
      const tooltipContent = `
        <div style="min-width: 180px; font-family: 'Inter', sans-serif;">
          <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">${loc.name}</div>
          <div style="font-size: 11px; color: #666; margin-bottom: 6px;">${loc.location}</div>
          <div style="display: flex; gap: 12px; font-size: 11px;">
            <span>👥 ${loc.volunteers} volunteers</span>
          </div>
          ${loc.status !== 'planned' ? `<div style="font-size: 11px; margin-top: 4px;">📊 ${loc.coverage}% coverage</div>` : ''}
          <div style="font-size: 10px; color: #999; margin-top: 6px;">Click for details</div>
        </div>
      `;
      marker.bindTooltip(tooltipContent, {
        direction: 'top',
        offset: [0, -32],
        opacity: 0.95,
        className: 'sfh-marker-tooltip',
      });

      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;
  }, [filteredLocations, showCoverage, statusIcons]);

  const handleResetView = () => {
    if (mapRef.current) {
      mapRef.current.setView(MAP_DEFAULTS.center, MAP_DEFAULTS.zoom);
    }
    setSelectedLocation(null);
  };

  const handleLocationClick = (location: OutreachLocation) => {
    setSelectedLocation(location);
    if (mapRef.current) {
      mapRef.current.setView([location.lat, location.lng], 12);
    }
  };

  const stats = {
    totalLocations: outreachLocations.length,
    ongoing: outreachLocations.filter((l) => l.status === 'ongoing').length,
    planned: outreachLocations.filter((l) => l.status === 'planned').length,
    completed: outreachLocations.filter((l) => l.status === 'completed').length,
    totalBeneficiaries: outreachLocations.reduce((acc, l) => acc + l.beneficiaries, 0),
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ongoing':
        return <Badge className="status-ongoing border">Ongoing</Badge>;
      case 'planned':
        return <Badge className="status-planned border">Planned</Badge>;
      case 'completed':
        return <Badge className="status-completed border">Completed</Badge>;
      default:
        return null;
    }
  };


  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Geographic Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Monitor outreach activities across Rwanda in real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => {
              if (mapRef.current) {
                mapRef.current.locate({ setView: true, maxZoom: 12 });
                toast({
                  title: "Locating...",
                  description: "Finding your current location on the map.",
                });
              }
            }}
          >
            <Navigation className="w-4 h-4" />
            My Location
          </Button>
          <Button className="gap-2" onClick={() => setShowAddLocation(true)}>
            <MapPin className="w-4 h-4" />
            Add Location
          </Button>
        </div>
      </div>

      <AddLocationModal open={showAddLocation} onOpenChange={setShowAddLocation} />
      <ProgramDetailsModal
        open={detailsOpen}
        onOpenChange={(o) => {
          setDetailsOpen(o);
          if (!o) setDetailsProgramId(null);
        }}
        programId={detailsProgramId}
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="sfh-card p-4">
          <p className="text-sm text-muted-foreground">Total Locations</p>
          <p className="text-2xl font-bold mt-1">{stats.totalLocations}</p>
        </Card>
        <Card className="sfh-card p-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success"></div>
            <p className="text-sm text-muted-foreground">Ongoing</p>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.ongoing}</p>
        </Card>
        <Card className="sfh-card p-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-info"></div>
            <p className="text-sm text-muted-foreground">Planned</p>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.planned}</p>
        </Card>
        <Card className="sfh-card p-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent"></div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.completed}</p>
        </Card>
        <Card className="sfh-card p-4">
          <p className="text-sm text-muted-foreground">Beneficiaries Reached</p>
          <p className="text-2xl font-bold mt-1">{stats.totalBeneficiaries.toLocaleString()}</p>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Map Section */}
        <div className="xl:col-span-3">
          <Card className="sfh-card overflow-hidden">
            {/* Map Controls */}
            <div className="p-4 border-b flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search locations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-48 h-9"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant={showCoverage ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowCoverage(!showCoverage)}
                  className="gap-2"
                >
                  <Layers className="w-4 h-4" />
                  Coverage
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetView}
              >
                Reset View
              </Button>
            </div>

            {/* Map Container */}
            <div className="h-[500px] relative">
              <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />

              {/* Map Legend */}
              <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg border shadow-lg p-3 z-[1000]">
                <p className="text-xs font-semibold mb-2">Legend</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success"></div>
                    <span className="text-xs">Ongoing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-info"></div>
                    <span className="text-xs">Planned</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-accent"></div>
                    <span className="text-xs">Completed</span>
                  </div>
                  {showCoverage && (
                    <div className="flex items-center gap-2 pt-1 border-t mt-1">
                      <div className="w-3 h-3 rounded-full bg-success/30 border border-success"></div>
                      <span className="text-xs">Coverage Area</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar - scrollable on all screen sizes */}
        <div className="xl:col-span-1 flex flex-col gap-4 max-h-[calc(100vh-12rem)] min-h-0 overflow-y-auto overscroll-contain pr-1">
          {/* Selected Location Details */}
          {selectedLocation && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-shrink-0"
            >
              <Card className="sfh-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      {getStatusBadge(selectedLocation.status)}
                      <CardTitle className="text-base font-semibold mt-2">
                        {selectedLocation.name}
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSelectedLocation(null)}
                    >
                      ×
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[min(75vh,560px)] overflow-y-auto overscroll-y-contain pr-1 -mr-1">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{selectedLocation.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Started{' '}
                        {new Date(selectedLocation.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">{selectedLocation.coverage}%</span>
                    </div>
                    <Progress value={selectedLocation.coverage} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <Users className="w-4 h-4 mx-auto text-primary mb-1" />
                      <p className="text-lg font-semibold">{selectedLocation.volunteers}</p>
                      <p className="text-xs text-muted-foreground">Volunteers</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <HeartHandshake className="w-4 h-4 mx-auto text-accent mb-1" />
                      <p className="text-lg font-semibold">
                        {selectedLocation.beneficiaries.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Beneficiaries</p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      setDetailsProgramId(String(selectedLocation.id));
                      setDetailsOpen(true);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                    View Full Details
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Location List */}
          <Card className="sfh-card flex-shrink-0 flex flex-col min-h-0">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="text-base font-semibold">Filtered programs</CardTitle>
              <p className="text-xs text-muted-foreground font-normal mt-1">
                Matches your search and status filters.
              </p>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-0 overflow-hidden">
              <div className="max-h-[min(50vh,400px)] overflow-y-auto overscroll-contain">
                {filteredLocations.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No programs match the current filters.
                  </div>
                ) : (
                  filteredLocations.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => handleLocationClick(loc)}
                      className={cn(
                        'w-full text-left p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors',
                        selectedLocation?.id === loc.id && 'bg-primary/5'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'w-2 h-2 rounded-full flex-shrink-0',
                                loc.status === 'ongoing' && 'bg-success',
                                loc.status === 'planned' && 'bg-info',
                                loc.status === 'completed' && 'bg-accent'
                              )}
                            ></div>
                            <p className="font-medium text-sm truncate">{loc.name}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 ml-4">
                            {loc.location}
                          </p>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </motion.div>
  );
};

export default GeographicPage;
