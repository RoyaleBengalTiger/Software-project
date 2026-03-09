import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import BackButton from "@/components/BackButton";
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGeolocation } from "@/hooks/use-geolocation";
import { mapApi, Officer } from "@/api/map";
import { issuesApi, IssueMapMarker } from "@/api/issues";
import IssueDetailModal from "@/components/IssueDetailModal";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
    MapPin,
    Navigation,
    Mail,
    Loader2,
    Search,
    X,
    ArrowRight,
    Menu,
    Leaf,
    Shield,
    ChevronRight,
    Eye,
    EyeOff,
} from "lucide-react";

// ─── Fix default Leaflet marker icons ───
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Custom icons for officers ───
const createIcon = (colorUrl: string) =>
    new L.Icon({
        iconUrl: colorUrl,
        shadowUrl:
            "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });

const officerIcon = createIcon(
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png"
);
const selectedOfficerIcon = createIcon(
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png"
);

// ─── Disease color palette ───
const DISEASE_COLORS = [
    "#EF4444", // red
    "#F59E0B", // amber
    "#10B981", // emerald
    "#8B5CF6", // violet
    "#EC4899", // pink
    "#06B6D4", // cyan
    "#F97316", // orange
    "#6366F1", // indigo
    "#14B8A6", // teal
    "#E11D48", // rose
    "#84CC16", // lime
    "#A855F7", // purple
    "#0EA5E9", // sky
    "#D946EF", // fuchsia
    "#78716C", // stone
];

function getDiseaseColor(index: number): string {
    return DISEASE_COLORS[index % DISEASE_COLORS.length];
}

// ─── Google Maps–style "My Location" button ───
function MyLocationControl({
    onLocated,
}: {
    onLocated: (lat: number, lng: number) => void;
}) {
    const map = useMap();

    useEffect(() => {
        const control = new L.Control({ position: "bottomright" });

        control.onAdd = () => {
            const container = L.DomUtil.create("div", "");
            container.style.cssText = "pointer-events:auto;";

            const btn = document.createElement("button");
            btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v3"/>
          <path d="M12 19v3"/>
          <path d="M2 12h3"/>
          <path d="M19 12h3"/>
        </svg>
      `;
            btn.title = "Go to my location";
            btn.style.cssText = `
        width: 40px; height: 40px;
        background: white; border: none; border-radius: 4px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        color: #666;
        transition: color 0.2s, box-shadow 0.2s;
      `;
            btn.onmouseenter = () => { btn.style.color = "#4285F4"; };
            btn.onmouseleave = () => { btn.style.color = "#666"; };

            btn.onclick = (e) => {
                e.stopPropagation();
                if (!navigator.geolocation) return;
                btn.style.color = "#4285F4";
                const svg = btn.querySelector("svg");
                if (svg) svg.style.animation = "spin 1s linear infinite";

                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const lat = parseFloat(pos.coords.latitude.toFixed(6));
                        const lng = parseFloat(pos.coords.longitude.toFixed(6));
                        onLocated(lat, lng);
                        map.flyTo([lat, lng], 16, { duration: 1.5 });
                        if (svg) svg.style.animation = "";
                    },
                    () => {
                        if (svg) svg.style.animation = "";
                        btn.style.color = "#d93025";
                        setTimeout(() => { btn.style.color = "#666"; }, 2000);
                    },
                    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
                );
            };

            if (!document.getElementById("leaflet-spin-style")) {
                const style = document.createElement("style");
                style.id = "leaflet-spin-style";
                style.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
                document.head.appendChild(style);
            }

            L.DomEvent.disableClickPropagation(container);
            container.appendChild(btn);
            return container;
        };

        control.addTo(map);
        return () => { control.remove(); };
    }, [map, onLocated]);

    return null;
}

// ─── Haversine distance ───
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── FlyTo Helper ───
function FlyToPosition({ position, zoom }: { position: [number, number] | null; zoom: number }) {
    const map = useMap();
    useEffect(() => {
        if (position) {
            map.flyTo(position, zoom, { duration: 1.5, easeLinearity: 0.25 });
        }
    }, [position, zoom, map]);
    return null;
}

interface OfficerWithDistance extends Officer {
    distance: number | null;
}

// ─── Types for sidebar ───
type FilterCategory = string; // crop name or "__officers__"
const OFFICERS_KEY = "__officers__";

const MapPage = () => {
    const { toast } = useToast();
    const { token } = useAuth();
    const geo = useGeolocation();
    const [userLat, setUserLat] = useState<number | null>(null);
    const [userLng, setUserLng] = useState<number | null>(null);

    const [officers, setOfficers] = useState<Officer[]>([]);
    const [issues, setIssues] = useState<IssueMapMarker[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOfficerId, setSelectedOfficerId] = useState<number | null>(null);
    const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
    const [flyZoom, setFlyZoom] = useState(13);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Filter state
    const [activeFilters, setActiveFilters] = useState<Set<FilterCategory>>(new Set([OFFICERS_KEY]));
    const [hiddenDiseases, setHiddenDiseases] = useState<Set<string>>(new Set());

    // Issue detail modal
    const [modalIssueId, setModalIssueId] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const listRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const [searchParams] = useSearchParams();
    const officerUsername = searchParams.get("username");

    // ─── Fetch data ───
    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            try {
                setLoading(true);
                const [officerData, issueData] = await Promise.all([
                    mapApi.getOfficers(),
                    issuesApi.mapMarkers().catch(() => []),
                ]);
                if (!cancelled) {
                    setOfficers(officerData);
                    setIssues(issueData);
                }
            } catch (err: any) {
                if (!cancelled) {
                    toast({
                        title: "Error",
                        description: err?.message || "Failed to load map data",
                        variant: "destructive",
                    });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        if (token) fetchData();
        return () => { cancelled = true; };
    }, [token, toast]);

    // ─── Derived data ───

    // Unique crop names from issues
    const cropNames = useMemo(() => {
        const names = new Set<string>();
        for (const issue of issues) {
            if (issue.cropName) names.add(issue.cropName);
        }
        return [...names].sort();
    }, [issues]);

    // Build a stable disease→color mapping
    const diseaseColorMap = useMemo(() => {
        const diseases = new Set<string>();
        for (const issue of issues) {
            const d = issue.reviewedDisease || issue.predictedDisease;
            if (d) diseases.add(d);
        }
        const sorted = [...diseases].sort();
        const map = new Map<string, string>();
        sorted.forEach((d, i) => map.set(d, getDiseaseColor(i)));
        return map;
    }, [issues]);

    // Issues filtered by active crop filters
    const filteredIssues = useMemo(() => {
        const cropFilters = new Set<string>();
        for (const f of activeFilters) {
            if (f !== OFFICERS_KEY) cropFilters.add(f);
        }
        if (cropFilters.size === 0) return [];
        return issues.filter((issue) => {
            if (!issue.cropName || !cropFilters.has(issue.cropName)) return false;
            const disease = issue.reviewedDisease || issue.predictedDisease;
            if (disease && hiddenDiseases.has(disease)) return false;
            return true;
        });
    }, [issues, activeFilters, hiddenDiseases]);

    // Group filtered issues by disease for the sidebar list
    const issuesByDisease = useMemo(() => {
        const map = new Map<string, IssueMapMarker[]>();
        for (const issue of filteredIssues) {
            const d = issue.reviewedDisease || issue.predictedDisease || "Unknown";
            if (!map.has(d)) map.set(d, []);
            map.get(d)!.push(issue);
        }
        return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
    }, [filteredIssues]);

    // All diseases present in currently filtered crops (for legend)
    const legendDiseases = useMemo(() => {
        const cropFilters = new Set<string>();
        for (const f of activeFilters) {
            if (f !== OFFICERS_KEY) cropFilters.add(f);
        }
        if (cropFilters.size === 0) return [];
        const diseases = new Set<string>();
        for (const issue of issues) {
            if (issue.cropName && cropFilters.has(issue.cropName)) {
                const d = issue.reviewedDisease || issue.predictedDisease;
                if (d) diseases.add(d);
            }
        }
        return [...diseases].sort();
    }, [issues, activeFilters]);

    const showOfficers = activeFilters.has(OFFICERS_KEY);

    // Officers with distance
    const sortedOfficers: OfficerWithDistance[] = useMemo(() => {
        const withDist = officers.map((o) => ({
            ...o,
            distance:
                geo.latitude != null && geo.longitude != null
                    ? haversineKm(geo.latitude, geo.longitude, o.latitude, o.longitude)
                    : null,
        }));
        if (geo.latitude != null && geo.longitude != null) {
            withDist.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        } else {
            withDist.sort((a, b) => a.username.localeCompare(b.username));
        }
        return withDist;
    }, [officers, geo.latitude, geo.longitude]);

    const selectedOfficer = useMemo(
        () => officers.find((o) => o.id === selectedOfficerId) || null,
        [officers, selectedOfficerId]
    );

    // ─── Handlers ───

    const handleMapLocated = useCallback((lat: number, lng: number) => {
        setUserLat(lat);
        setUserLng(lng);
    }, []);

    useEffect(() => {
        if (geo.latitude != null && geo.longitude != null) {
            setUserLat(geo.latitude);
            setUserLng(geo.longitude);
        }
    }, [geo.latitude, geo.longitude]);

    const handleSelectOfficer = useCallback((officer: OfficerWithDistance) => {
        setSelectedOfficerId(officer.id);
        setFlyTarget([officer.latitude, officer.longitude]);
        setFlyZoom(15);
        const el = listRefs.current[`officer-${officer.id}`];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, []);

    const handleSelectIssue = useCallback((issue: IssueMapMarker) => {
        setFlyTarget([issue.latitude, issue.longitude]);
        setFlyZoom(15);
    }, []);

    // Deep link handler for officer
    useEffect(() => {
        if (officerUsername && sortedOfficers.length > 0 && !selectedOfficerId) {
            const found = sortedOfficers.find(o => o.username.toLowerCase() === officerUsername.toLowerCase());
            if (found) handleSelectOfficer(found);
        }
    }, [sortedOfficers, officerUsername, selectedOfficerId, handleSelectOfficer]);

    const openDirections = useCallback(
        (officer: Officer) => {
            let url: string;
            if (geo.latitude != null && geo.longitude != null) {
                url = `https://www.google.com/maps/dir/?api=1&origin=${geo.latitude},${geo.longitude}&destination=${officer.latitude},${officer.longitude}`;
            } else {
                url = `https://www.google.com/maps/dir/?api=1&destination=${officer.latitude},${officer.longitude}`;
            }
            window.open(url, "_blank", "noopener");
        },
        [geo.latitude, geo.longitude]
    );

    const mapCenter: [number, number] = useMemo(() => {
        if (geo.latitude != null && geo.longitude != null)
            return [geo.latitude, geo.longitude];
        return [23.8103, 90.4125];
    }, [geo.latitude, geo.longitude]);

    const toggleFilter = useCallback((key: FilterCategory) => {
        setActiveFilters((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
        // Reset officer detail when toggling off officers
        if (key === OFFICERS_KEY) setSelectedOfficerId(null);
    }, []);

    const toggleDiseaseVisibility = useCallback((disease: string) => {
        setHiddenDiseases((prev) => {
            const next = new Set(prev);
            if (next.has(disease)) next.delete(disease);
            else next.add(disease);
            return next;
        });
    }, []);

    const clearOfficerSelection = () => setSelectedOfficerId(null);

    // Are any crop filters active?
    const hasCropFilters = useMemo(() => {
        for (const f of activeFilters) {
            if (f !== OFFICERS_KEY) return true;
        }
        return false;
    }, [activeFilters]);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-background">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="relative h-full w-full overflow-hidden flex flex-col">
            {/* Floating Back Button */}
            <div className="absolute top-3 right-3 z-[1000]">
                <BackButton className="bg-background/90 backdrop-blur shadow-sm border border-border/50 hover:bg-background" />
            </div>

            {/* ─── Map Background ─── */}
            <div className="absolute inset-0 z-0">
                <MapContainer
                    center={mapCenter}
                    zoom={8}
                    className="h-full w-full"
                    zoomControl={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <FlyToPosition position={flyTarget} zoom={flyZoom} />
                    <MyLocationControl onLocated={handleMapLocated} />

                    {/* Blue pulsing dot for user's location */}
                    {userLat != null && userLng != null && (
                        <>
                            <CircleMarker
                                center={[userLat, userLng]}
                                radius={18}
                                pathOptions={{
                                    color: "#4285F4",
                                    fillColor: "#4285F4",
                                    fillOpacity: 0.15,
                                    weight: 1,
                                    opacity: 0.3,
                                }}
                            />
                            <CircleMarker
                                center={[userLat, userLng]}
                                radius={7}
                                pathOptions={{
                                    color: "white",
                                    fillColor: "#4285F4",
                                    fillOpacity: 1,
                                    weight: 2,
                                }}
                            >
                                <Popup>You are here</Popup>
                            </CircleMarker>
                        </>
                    )}

                    {/* Officer markers */}
                    {showOfficers && sortedOfficers.map((officer) => (
                        <Marker
                            key={officer.id}
                            position={[officer.latitude, officer.longitude]}
                            icon={selectedOfficerId === officer.id ? selectedOfficerIcon : officerIcon}
                            eventHandlers={{
                                click: () => handleSelectOfficer(officer),
                            }}
                        />
                    ))}

                    {/* Issue markers - colored circles by disease */}
                    {filteredIssues.map((issue) => {
                        const disease = issue.reviewedDisease || issue.predictedDisease || "Unknown";
                        const color = diseaseColorMap.get(disease) || "#6B7280";
                        return (
                            <CircleMarker
                                key={`issue-${issue.id}`}
                                center={[issue.latitude, issue.longitude]}
                                radius={7}
                                pathOptions={{
                                    color: color,
                                    fillColor: color,
                                    fillOpacity: 0.85,
                                    weight: 2,
                                    opacity: 1,
                                }}
                            >
                                <Popup>
                                    <div style={{ minWidth: 200 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                            <span style={{
                                                display: "inline-block",
                                                width: 10,
                                                height: 10,
                                                borderRadius: "50%",
                                                backgroundColor: color,
                                                flexShrink: 0,
                                            }} />
                                            <strong>{disease}</strong>
                                        </div>
                                        {issue.cropName && <div style={{ fontSize: 12, color: "#666" }}>Crop: {issue.cropName}</div>}
                                        <div style={{ fontSize: 12, color: "#666" }}>
                                            Status: <span style={{
                                                fontWeight: 600,
                                                color: issue.status === "NEW" ? "#3B82F6" :
                                                    issue.status === "UNDER_REVIEW" ? "#F59E0B" :
                                                    issue.status === "GROUPED_IN_CHAT" ? "#22C55E" :
                                                    issue.status === "RESOLVED" ? "#10B981" : "#6B7280"
                                            }}>{issue.status.replace(/_/g, " ")}</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: "#666" }}>By: {issue.farmerUsername}</div>
                                        <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
                                            {new Date(issue.createdAt).toLocaleDateString()}
                                        </div>
                                        {issue.linkedChatId && (
                                            <div style={{ marginTop: 6 }}>
                                                <Link
                                                    to={`/chats/${issue.linkedChatId}`}
                                                    style={{ fontSize: 12, color: "#3B82F6", textDecoration: "underline" }}
                                                >
                                                    Open Chat: {issue.linkedChatTitle || `#${issue.linkedChatId}`}
                                                </Link>
                                            </div>
                                        )}
                                        <div style={{ marginTop: 6 }}>
                                            <button
                                                onClick={() => { setModalIssueId(issue.id); setModalOpen(true); }}
                                                style={{ fontSize: 12, color: "#3B82F6", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                                            >
                                                View Issue Details
                                            </button>
                                        </div>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        );
                    })}
                </MapContainer>
            </div>

            {/* ─── Floating Sidebar ─── */}
            <div
                className={`absolute z-10
                    top-0 left-0 bottom-0 w-full sm:w-[380px]
                    transition-transform duration-300 ease-in-out
                    p-3 pointer-events-none
                    ${isSidebarOpen ? "translate-x-0" : "-translate-x-full sm:-translate-x-[calc(100%+1rem)]"}
                `}
            >
                <div className="h-full flex flex-col gap-3 pointer-events-auto">
                    {/* Toggle / Title Bar */}
                    <Card className="p-2 flex items-center gap-2 shadow-xl bg-background/95 backdrop-blur border-border/50">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">Map Explorer</div>
                        </div>
                    </Card>

                    {/* Filter Chips */}
                    <Card className="p-3 shadow-xl bg-background/95 backdrop-blur border-border/50">
                        <div className="text-xs font-medium text-muted-foreground mb-2">FILTERS</div>
                        <div className="flex flex-wrap gap-1.5">
                            {/* Officers filter */}
                            <button
                                onClick={() => toggleFilter(OFFICERS_KEY)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                                    showOfficers
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted"
                                }`}
                            >
                                <Shield className="h-3 w-3" />
                                Officers
                                <Badge variant={showOfficers ? "secondary" : "outline"} className="px-1 py-0 text-[10px] min-w-[18px] text-center rounded-full">
                                    {officers.length}
                                </Badge>
                            </button>

                            {/* Crop filters */}
                            {cropNames.map((crop) => {
                                const active = activeFilters.has(crop);
                                const count = issues.filter((i) => i.cropName === crop).length;
                                return (
                                    <button
                                        key={crop}
                                        onClick={() => toggleFilter(crop)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                                            active
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted"
                                        }`}
                                    >
                                        <Leaf className="h-3 w-3" />
                                        {crop}
                                        <Badge variant={active ? "secondary" : "outline"} className="px-1 py-0 text-[10px] min-w-[18px] text-center rounded-full">
                                            {count}
                                        </Badge>
                                    </button>
                                );
                            })}
                        </div>
                    </Card>

                    {/* List Card */}
                    <Card className="flex-1 overflow-hidden shadow-xl bg-background/95 backdrop-blur border-border/50 flex flex-col">
                        {selectedOfficerId && selectedOfficer ? (
                            // ─── Officer Detail View ───
                            <div className="flex flex-col h-full">
                                <div className="p-3 border-b border-border/50 flex items-center justify-between bg-primary/5">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="-ml-2 gap-1 text-muted-foreground hover:text-foreground"
                                        onClick={clearOfficerSelection}
                                    >
                                        <ArrowRight className="h-4 w-4 rotate-180" />
                                        Back
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearOfficerSelection}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="p-5 space-y-5 flex-1 overflow-y-auto">
                                    <div className="text-center">
                                        <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary mb-2">
                                            {selectedOfficer.username.charAt(0).toUpperCase()}
                                        </div>
                                        <h2 className="text-lg font-bold">{selectedOfficer.username}</h2>
                                        <p className="text-xs text-muted-foreground">Govt. Agricultural Officer</p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                            <Mail className="h-4 w-4 text-primary mt-0.5" />
                                            <div>
                                                <p className="text-[10px] font-medium text-muted-foreground uppercase">Email</p>
                                                <p className="text-sm break-all">{selectedOfficer.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                            <MapPin className="h-4 w-4 text-primary mt-0.5" />
                                            <div>
                                                <p className="text-[10px] font-medium text-muted-foreground uppercase">Location</p>
                                                <p className="text-sm">
                                                    {selectedOfficer.latitude.toFixed(5)}, {selectedOfficer.longitude.toFixed(5)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 border-t border-border/50 bg-muted/20">
                                    <Button className="w-full gap-2" onClick={() => openDirections(selectedOfficer)}>
                                        <Navigation className="h-4 w-4" />
                                        Get Directions
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            // ─── List View ───
                            <div className="flex flex-col h-full">
                                <ScrollArea className="flex-1">
                                    <div className="divide-y divide-border/30">
                                        {/* Officers section */}
                                        {showOfficers && (
                                            <>
                                                <div className="p-3 bg-muted/20 flex justify-between items-center text-xs font-medium text-muted-foreground sticky top-0 z-10">
                                                    <span className="flex items-center gap-1.5">
                                                        <Shield className="h-3 w-3" />
                                                        OFFICERS
                                                    </span>
                                                    <span>{sortedOfficers.length}</span>
                                                </div>
                                                {sortedOfficers.map((officer) => (
                                                    <div
                                                        key={officer.id}
                                                        ref={(el) => (listRefs.current[`officer-${officer.id}`] = el)}
                                                        onClick={() => handleSelectOfficer(officer)}
                                                        className="p-3 hover:bg-muted/50 cursor-pointer transition-colors flex items-center gap-3 group"
                                                    >
                                                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 text-sm border border-primary/20">
                                                            {officer.username.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{officer.username}</h4>
                                                            <p className="text-xs text-muted-foreground truncate">{officer.email}</p>
                                                            {officer.distance != null && (
                                                                <p className="text-xs font-medium text-emerald-600 mt-0.5 flex items-center gap-1">
                                                                    <Navigation className="h-3 w-3" />
                                                                    {officer.distance < 1
                                                                        ? `${(officer.distance * 1000).toFixed(0)} m`
                                                                        : `${officer.distance.toFixed(1)} km`}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    </div>
                                                ))}
                                                {sortedOfficers.length === 0 && (
                                                    <div className="p-6 text-center text-muted-foreground text-sm">
                                                        No officers found.
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Issues by disease sections */}
                                        {hasCropFilters && issuesByDisease.map(([disease, diseaseIssues]) => {
                                            const color = diseaseColorMap.get(disease) || "#6B7280";
                                            return (
                                                <div key={disease}>
                                                    <div className="p-3 bg-muted/20 flex justify-between items-center text-xs font-medium text-muted-foreground sticky top-0 z-10">
                                                        <span className="flex items-center gap-1.5">
                                                            <span
                                                                className="inline-block w-3 h-3 rounded-full shrink-0"
                                                                style={{ backgroundColor: color }}
                                                            />
                                                            {disease}
                                                        </span>
                                                        <span>{diseaseIssues.length}</span>
                                                    </div>
                                                    {diseaseIssues.map((issue) => (
                                                        <div
                                                            key={issue.id}
                                                            ref={(el) => (listRefs.current[`issue-${issue.id}`] = el)}
                                                            onClick={() => handleSelectIssue(issue)}
                                                            className="p-3 hover:bg-muted/50 cursor-pointer transition-colors flex items-center gap-3 group"
                                                        >
                                                            <span
                                                                className="w-3 h-3 rounded-full shrink-0"
                                                                style={{ backgroundColor: color }}
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium text-sm truncate">
                                                                        #{issue.id}
                                                                    </span>
                                                                    {issue.cropName && (
                                                                        <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">
                                                                            {issue.cropName}
                                                                        </span>
                                                                    )}
                                                                    <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-medium ${
                                                                        issue.status === "NEW" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" :
                                                                        issue.status === "UNDER_REVIEW" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" :
                                                                        issue.status === "GROUPED_IN_CHAT" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" :
                                                                        issue.status === "RESOLVED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" :
                                                                        "bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-400"
                                                                    }`}>
                                                                        {issue.status.replace(/_/g, " ")}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                                    {issue.farmerUsername} &middot; {new Date(issue.createdAt).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setModalIssueId(issue.id);
                                                                    setModalOpen(true);
                                                                }}
                                                                className="shrink-0 h-7 w-7 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
                                                            >
                                                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })}

                                        {/* Empty state */}
                                        {!showOfficers && !hasCropFilters && (
                                            <div className="p-8 text-center text-muted-foreground">
                                                <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                                <p className="text-sm font-medium">No filters selected</p>
                                                <p className="text-xs mt-1">Select a crop or Officers from the filter chips above.</p>
                                            </div>
                                        )}

                                        {hasCropFilters && issuesByDisease.length === 0 && (
                                            <div className="p-6 text-center text-muted-foreground text-sm">
                                                No issues found for selected crop(s).
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* ─── Re-open Sidebar Button ─── */}
            {!isSidebarOpen && (
                <div className="absolute top-4 left-4 z-10">
                    <Button
                        className="shadow-xl h-10 w-10 rounded-full"
                        size="icon"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu className="h-5 w-5" />
                    </Button>
                </div>
            )}

            {/* ─── Disease Legend (bottom-left) ─── */}
            {hasCropFilters && legendDiseases.length > 0 && (
                <div className="absolute bottom-4 left-4 sm:left-[400px] z-10 pointer-events-auto">
                    <Card className="p-3 shadow-xl bg-background/95 backdrop-blur border-border/50 max-w-[280px]">
                        <div className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Disease Legend</div>
                        <div className="space-y-1">
                            {legendDiseases.map((disease) => {
                                const color = diseaseColorMap.get(disease) || "#6B7280";
                                const hidden = hiddenDiseases.has(disease);
                                const count = issues.filter((i) => {
                                    const d = i.reviewedDisease || i.predictedDisease;
                                    return d === disease && i.cropName && activeFilters.has(i.cropName);
                                }).length;
                                return (
                                    <button
                                        key={disease}
                                        onClick={() => toggleDiseaseVisibility(disease)}
                                        className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-xs transition-colors hover:bg-muted/50 ${
                                            hidden ? "opacity-40" : ""
                                        }`}
                                    >
                                        <span
                                            className="w-3 h-3 rounded-full shrink-0"
                                            style={{ backgroundColor: hidden ? "#9CA3AF" : color }}
                                        />
                                        <span className="flex-1 text-left truncate">{disease}</span>
                                        <span className="text-muted-foreground text-[10px]">{count}</span>
                                        {hidden ? (
                                            <EyeOff className="h-3 w-3 text-muted-foreground shrink-0" />
                                        ) : (
                                            <Eye className="h-3 w-3 text-muted-foreground shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            )}

            {/* Issue Detail Modal */}
            <IssueDetailModal
                issueId={modalIssueId}
                open={modalOpen}
                onOpenChange={setModalOpen}
            />
        </div>
    );
};

export default MapPage;
