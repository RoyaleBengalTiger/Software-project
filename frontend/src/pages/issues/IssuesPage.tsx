import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import BackButton from "@/components/BackButton";
import { issuesApi, Issue, IssueStatus } from "@/api/issues";
import { chatRoomsApi, ChatRoom } from "@/api/chatrooms";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import IssueDetailModal from "@/components/IssueDetailModal";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Users,
  MessageSquare,
  Plus,
  RefreshCw,
  ChevronRight,
  MapPin,
  Loader2,
  Search,
  Inbox,
  UserCheck,
  List,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SpringPage<T> = { content: T[] };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function contains(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function filterIssues(list: Issue[], q: string): Issue[] {
  const query = q.trim();
  if (!query) return list;
  return list.filter((issue) => {
    const blob = [
      String(issue.id),
      issue.predictedDisease,
      issue.reviewedDisease ?? "",
      issue.cropName ?? "",
      issue.farmerUsername,
      issue.locationText ?? "",
      issue.linkedChatTitle ?? "",
      issue.note ?? "",
    ]
      .filter(Boolean)
      .join(" ");
    return contains(blob, query);
  });
}

function diseaseName(issue: Issue): string {
  return issue.reviewedDisease || issue.predictedDisease || "Unknown disease";
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  IssueStatus,
  { label: string; className: string }
> = {
  NEW: {
    label: "New",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  GROUPED_IN_CHAT: {
    label: "In Chat",
    className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
  RESOLVED: {
    label: "Resolved",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  CLOSED: {
    label: "Closed",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-400",
  },
};

function IssueStatusBadge({ status }: { status: IssueStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.NEW;
  return (
    <Badge
      variant="secondary"
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium border-0 ${cfg.className}`}
    >
      {cfg.label}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Skeleton / Empty state
// ---------------------------------------------------------------------------

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border/60 bg-card/50 px-4 py-3 animate-pulse"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2 w-full">
              <div className="flex items-center gap-2">
                <div className="h-4 w-44 bg-muted rounded" />
                <div className="h-4 w-16 bg-muted rounded" />
              </div>
              <div className="h-3 w-60 bg-muted rounded" />
            </div>
            <div className="h-8 w-8 bg-muted rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 p-8 text-center bg-card/30">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted">
        <AlertCircle className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="font-medium">{title}</div>
      {hint && (
        <div className="mt-1 text-sm text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Issue list item
// ---------------------------------------------------------------------------

function IssueListItem({
  issue,
  selectable,
  selected,
  onToggle,
  onOpen,
}: {
  issue: Issue;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      className={`
        group w-full text-left rounded-xl border bg-card/50 px-4 py-3
        hover:bg-card/70 transition-colors
        ${selected ? "border-primary/50 bg-primary/5" : "border-border/60"}
      `}
    >
      <div className="flex items-center gap-3">
        {/* Issue number pill */}
        <div className="shrink-0 h-8 min-w-[2rem] px-2 rounded-lg bg-muted/70 flex items-center justify-center">
          <span className="text-xs font-semibold text-muted-foreground tabular-nums">{issue.id}</span>
        </div>

        {/* Main content - clickable */}
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="font-medium truncate">
              {diseaseName(issue)}
            </span>
            <IssueStatusBadge status={issue.status} />
            {issue.cropName && (
              <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                {issue.cropName}
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {issue.locationText && (
              <span className="flex items-center gap-1 truncate max-w-[200px]">
                <MapPin className="h-3 w-3" />
                {issue.locationText}
              </span>
            )}
          </div>
        </button>

        {/* Right side: selection checkbox (on hover / when selected) or chevron */}
        {selectable ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.();
            }}
            className={`
              shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-all
              ${
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 opacity-0 group-hover:opacity-100 hover:bg-muted"
              }
            `}
            aria-label={selected ? "Deselect issue" : "Select issue"}
          >
            {selected ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40" />
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            className="shrink-0 h-8 w-8 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter button
// ---------------------------------------------------------------------------

type OfficerFilter = "pool" | "assigned" | "all";
type FarmerFilter = "my" | "grouped";

const OFFICER_FILTERS: {
  key: OfficerFilter;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "pool", label: "Pool", icon: <Inbox className="h-3.5 w-3.5" /> },
  { key: "assigned", label: "My Issues", icon: <UserCheck className="h-3.5 w-3.5" /> },
  { key: "all", label: "All Issues", icon: <List className="h-3.5 w-3.5" /> },
];

const FARMER_FILTERS: {
  key: FarmerFilter;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "my", label: "My Issues", icon: <FileText className="h-3.5 w-3.5" /> },
  { key: "grouped", label: "Grouped", icon: <Users className="h-3.5 w-3.5" /> },
];

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function IssuesPage() {
  const { isGovtOfficer } = useAuth();
  const navigate = useNavigate();
  const { id: routeIssueId } = useParams();

  // Data
  const [poolIssues, setPoolIssues] = useState<Issue[]>([]);
  const [assignedIssues, setAssignedIssues] = useState<Issue[]>([]);
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [myIssues, setMyIssues] = useState<Issue[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [officerFilter, setOfficerFilter] = useState<OfficerFilter>("pool");
  const [farmerFilter, setFarmerFilter] = useState<FarmerFilter>("my");

  // Modal state
  const [modalIssueId, setModalIssueId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Dialog state
  const [createChatOpen, setCreateChatOpen] = useState(false);
  const [addToChatOpen, setAddToChatOpen] = useState(false);
  const [chatTitle, setChatTitle] = useState("");
  const [diseaseLabel, setDiseaseLabel] = useState("");
  const [existingChats, setExistingChats] = useState<ChatRoom[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // -----------------------------------------------------------------------
  // Deep-link: open modal if route has :id param
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (routeIssueId && !isNaN(Number(routeIssueId))) {
      setModalIssueId(Number(routeIssueId));
      setModalOpen(true);
    }
  }, [routeIssueId]);

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  const loadOfficerData = useCallback(async () => {
    const [poolRes, assignedRes, allRes] = await Promise.all([
      issuesApi.pool(0, 100),
      issuesApi.assigned(0, 100),
      issuesApi.all(0, 100),
    ]);
    setPoolIssues((poolRes as SpringPage<Issue>).content ?? []);
    setAssignedIssues((assignedRes as SpringPage<Issue>).content ?? []);
    setAllIssues((allRes as SpringPage<Issue>).content ?? []);
  }, []);

  const loadFarmerData = useCallback(async () => {
    const res = await issuesApi.myIssues(0, 100);
    setMyIssues((res as SpringPage<Issue>).content ?? []);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (isGovtOfficer) {
        await loadOfficerData();
      } else {
        await loadFarmerData();
      }
    } finally {
      setLoading(false);
    }
  }, [isGovtOfficer, loadOfficerData, loadFarmerData]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // -----------------------------------------------------------------------
  // Selection helpers
  // -----------------------------------------------------------------------

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedIssues = useMemo(() => {
    const pool = isGovtOfficer
      ? [...poolIssues, ...assignedIssues, ...allIssues]
      : myIssues;
    const seen = new Set<number>();
    return pool.filter((i) => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return selectedIds.has(i.id);
    });
  }, [selectedIds, poolIssues, assignedIssues, allIssues, myIssues, isGovtOfficer]);

  const selectedDisease = useMemo(() => {
    if (selectedIssues.length === 0) return "";
    const diseases = new Set(selectedIssues.map((i) => diseaseName(i)));
    return diseases.size === 1 ? [...diseases][0] : "";
  }, [selectedIssues]);

  // -----------------------------------------------------------------------
  // Create chat from selected issues
  // -----------------------------------------------------------------------

  const openCreateChatDialog = useCallback(() => {
    const prefill = selectedDisease || "New Chat";
    setChatTitle(prefill);
    setDiseaseLabel(selectedDisease);
    setCreateChatOpen(true);
  }, [selectedDisease]);

  const handleCreateChat = useCallback(async () => {
    if (!chatTitle.trim() || selectedIds.size === 0) return;
    setSubmitting(true);
    try {
      const chat = await chatRoomsApi.createFromIssues({
        title: chatTitle.trim(),
        diseaseLabel: diseaseLabel.trim() || undefined,
        issueIds: [...selectedIds],
      });
      clearSelection();
      setCreateChatOpen(false);
      navigate(`/chats/${chat.id}`);
    } catch (err) {
      console.error("Failed to create chat:", err);
    } finally {
      setSubmitting(false);
    }
  }, [chatTitle, diseaseLabel, selectedIds, clearSelection, navigate]);

  // -----------------------------------------------------------------------
  // Add selected issues to existing chat
  // -----------------------------------------------------------------------

  const openAddToChatDialog = useCallback(async () => {
    setAddToChatOpen(true);
    if (selectedDisease) {
      try {
        const chats = await chatRoomsApi.byDisease(selectedDisease);
        setExistingChats(chats.filter((c) => c.status === "ACTIVE"));
      } catch {
        setExistingChats([]);
      }
    } else {
      try {
        const res = await chatRoomsApi.active(0, 50);
        setExistingChats(
          ((res as SpringPage<ChatRoom>).content ?? []).filter(
            (c) => c.status === "ACTIVE"
          )
        );
      } catch {
        setExistingChats([]);
      }
    }
  }, [selectedDisease]);

  const handleAddToChat = useCallback(
    async (chatId: number) => {
      setSubmitting(true);
      try {
        await chatRoomsApi.addIssues(chatId, [...selectedIds]);
        clearSelection();
        setAddToChatOpen(false);
        await refresh();
      } catch (err) {
        console.error("Failed to add issues to chat:", err);
      } finally {
        setSubmitting(false);
      }
    },
    [selectedIds, clearSelection, refresh]
  );

  // -----------------------------------------------------------------------
  // Filtered data
  // -----------------------------------------------------------------------

  const filtered = useMemo(() => {
    return {
      pool: filterIssues(poolIssues, search),
      assigned: filterIssues(assignedIssues, search),
      all: filterIssues(allIssues, search),
      my: filterIssues(myIssues, search),
    };
  }, [poolIssues, assignedIssues, allIssues, myIssues, search]);

  const officerCounts: Record<OfficerFilter, number> = {
    pool: filtered.pool.length,
    assigned: filtered.assigned.length,
    all: filtered.all.length,
  };

  const farmerCounts: Record<FarmerFilter, number> = {
    my: filtered.my.length,
    grouped: 0, // set below
  };

  // Farmer: group issues by disease
  const groupedByDisease = useMemo(() => {
    const map = new Map<string, Issue[]>();
    for (const issue of filtered.my) {
      const key = diseaseName(issue);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(issue);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered.my]);

  farmerCounts.grouped = groupedByDisease.length;

  // Current visible list for officer
  const officerList = useMemo(() => {
    if (officerFilter === "pool") return filtered.pool;
    if (officerFilter === "assigned") return filtered.assigned;
    return filtered.all;
  }, [officerFilter, filtered]);

  // -----------------------------------------------------------------------
  // Open issue modal
  // -----------------------------------------------------------------------

  const openIssue = useCallback((id: number) => {
    setModalIssueId(id);
    setModalOpen(true);
  }, []);

  // -----------------------------------------------------------------------
  // Page title / hint
  // -----------------------------------------------------------------------

  const pageTitle = isGovtOfficer ? "Issue Queue" : "My Issues";
  const pageHint = isGovtOfficer
    ? "Review incoming issues, group them into chats, and collaborate with farmers."
    : "View your submitted issues and their current status.";

  // Officer filter empty state hints
  const officerEmptyHints: Record<OfficerFilter, { title: string; hint: string }> = {
    pool: {
      title: search ? "No results in Pool" : "No issues in pool",
      hint: search ? "Try a different keyword." : "Unassigned issues will appear here.",
    },
    assigned: {
      title: search ? "No results in My Issues" : "No issues assigned to you",
      hint: search ? "Try a different keyword." : "Accept issues from the pool to see them here.",
    },
    all: {
      title: search ? "No results" : "No issues found",
      hint: search ? "Try a different keyword." : "Issues submitted by farmers will appear here.",
    },
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-6">
      {/* ====== Sticky header ====== */}
      <div className="sticky top-0 z-20 -mx-3 sm:-mx-4 px-3 sm:px-4 py-3 bg-background/85 backdrop-blur border-b border-border/60">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <BackButton className="-ml-2 mb-1" />
            <h1 className="text-lg sm:text-2xl font-semibold truncate">
              {pageTitle}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 sm:line-clamp-2">
              {pageHint}
            </p>
          </div>
        </div>

        {/* Search + refresh bar */}
        <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative w-full sm:w-[360px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by disease, crop, user, location..."
              className="pl-9"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={refresh}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="mt-3 flex gap-2 flex-wrap">
          {isGovtOfficer
            ? OFFICER_FILTERS.map((f) => (
                <Button
                  key={f.key}
                  size="sm"
                  variant={officerFilter === f.key ? "default" : "outline"}
                  onClick={() => setOfficerFilter(f.key)}
                  className="gap-1.5"
                >
                  {f.icon}
                  {f.label}
                  <Badge
                    variant={officerFilter === f.key ? "secondary" : "outline"}
                    className="ml-1 px-1.5 py-0 rounded-full text-[10px] min-w-[20px] text-center"
                  >
                    {officerCounts[f.key]}
                  </Badge>
                </Button>
              ))
            : FARMER_FILTERS.map((f) => (
                <Button
                  key={f.key}
                  size="sm"
                  variant={farmerFilter === f.key ? "default" : "outline"}
                  onClick={() => setFarmerFilter(f.key)}
                  className="gap-1.5"
                >
                  {f.icon}
                  {f.label}
                  <Badge
                    variant={farmerFilter === f.key ? "secondary" : "outline"}
                    className="ml-1 px-1.5 py-0 rounded-full text-[10px] min-w-[20px] text-center"
                  >
                    {farmerCounts[f.key]}
                  </Badge>
                </Button>
              ))}
        </div>
      </div>

      {/* ====== Content ====== */}
      <div className="mt-4 sm:mt-6">
        {isGovtOfficer ? (
          /* ---------- Officer view ---------- */
          loading ? (
            <ListSkeleton />
          ) : officerFilter === "assigned" ? (
            /* --- My Issues: segmented into Under Review (selectable) and Others --- */
            (() => {
              const underReview = officerList.filter((i) => i.status === "UNDER_REVIEW");
              const others = officerList.filter((i) => i.status !== "UNDER_REVIEW");

              if (officerList.length === 0) {
                return (
                  <EmptyState
                    title={officerEmptyHints[officerFilter].title}
                    hint={officerEmptyHints[officerFilter].hint}
                  />
                );
              }

              return (
                <div className="space-y-6">
                  {/* Under Review section */}
                  {underReview.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                          Under Review
                        </h3>
                        <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px]">
                          {underReview.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {underReview.map((issue) => (
                          <IssueListItem
                            key={issue.id}
                            issue={issue}
                            selectable
                            selected={selectedIds.has(issue.id)}
                            onToggle={() => toggleSelect(issue.id)}
                            onOpen={() => openIssue(issue.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* In Chat & Others section */}
                  {others.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                          In Chat &amp; Others
                        </h3>
                        <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px]">
                          {others.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {others.map((issue) => (
                          <IssueListItem
                            key={issue.id}
                            issue={issue}
                            onOpen={() => openIssue(issue.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          ) : officerList.length === 0 ? (
            <EmptyState
              title={officerEmptyHints[officerFilter].title}
              hint={officerEmptyHints[officerFilter].hint}
            />
          ) : (
            <div className="space-y-2">
              {officerList.map((issue) => (
                <IssueListItem
                  key={issue.id}
                  issue={issue}
                  selectable={officerFilter === "pool"}
                  selected={officerFilter === "pool" ? selectedIds.has(issue.id) : undefined}
                  onToggle={officerFilter === "pool" ? () => toggleSelect(issue.id) : undefined}
                  onOpen={() => openIssue(issue.id)}
                />
              ))}
            </div>
          )
        ) : farmerFilter === "my" ? (
          /* ---------- Farmer: My Issues ---------- */
          loading ? (
            <ListSkeleton />
          ) : filtered.my.length === 0 ? (
            <EmptyState
              title={
                search ? "No results found" : "No issues submitted yet"
              }
              hint={
                search
                  ? "Try a different keyword."
                  : "Issues you submit via disease detection will appear here."
              }
            />
          ) : (
            <div className="space-y-2">
              {filtered.my.map((issue) => (
                <IssueListItem
                  key={issue.id}
                  issue={issue}
                  onOpen={() => openIssue(issue.id)}
                />
              ))}
            </div>
          )
        ) : (
          /* ---------- Farmer: Grouped by disease ---------- */
          loading ? (
            <ListSkeleton />
          ) : groupedByDisease.length === 0 ? (
            <EmptyState
              title={search ? "No results found" : "No issues to group"}
              hint={
                search
                  ? "Try a different keyword."
                  : "Once you have issues, they will be grouped by disease here."
              }
            />
          ) : (
            <div className="space-y-6">
              {groupedByDisease.map(([disease, issues]) => (
                <div key={disease}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm sm:text-base">
                      {disease}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="rounded-full px-2 py-0.5"
                    >
                      {issues.length}
                    </Badge>
                  </div>
                  <div className="space-y-2 pl-0 sm:pl-10">
                    {issues.map((issue) => (
                      <IssueListItem
                        key={issue.id}
                        issue={issue}
                        onOpen={() => openIssue(issue.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* ====== Officer selection action bar ====== */}
      {isGovtOfficer && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur px-3 sm:px-6 py-3">
          <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Badge
                variant="default"
                className="rounded-full px-3 py-1 text-sm"
              >
                {selectedIds.size} selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="text-muted-foreground"
              >
                Clear
              </Button>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={openCreateChatDialog}
                className="gap-2 flex-1 sm:flex-none"
              >
                <Plus className="h-4 w-4" />
                Create Chat from Selected ({selectedIds.size})
              </Button>
              <Button
                variant="outline"
                onClick={openAddToChatDialog}
                className="gap-2 flex-1 sm:flex-none"
              >
                <MessageSquare className="h-4 w-4" />
                Add to Existing Chat
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ====== Issue Detail Modal ====== */}
      <IssueDetailModal
        issueId={modalIssueId}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onIssueUpdated={refresh}
      />

      {/* ====== Create Chat Dialog ====== */}
      <Dialog open={createChatOpen} onOpenChange={setCreateChatOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Chat from Issues</DialogTitle>
            <DialogDescription>
              Group {selectedIds.size} selected issue
              {selectedIds.size !== 1 && "s"} into a new chat room.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Chat Title
              </label>
              <Input
                value={chatTitle}
                onChange={(e) => setChatTitle(e.target.value)}
                placeholder="e.g., Rice Blast - Kandy District"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Disease Label{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </label>
              <Input
                value={diseaseLabel}
                onChange={(e) => setDiseaseLabel(e.target.value)}
                placeholder="e.g., Rice Blast"
              />
            </div>

            {/* Preview selected issues */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Selected Issues
              </label>
              <div className="max-h-32 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
                {selectedIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="text-xs flex items-center gap-2 text-muted-foreground"
                  >
                    <FileText className="h-3 w-3 shrink-0" />
                    <span>
                      #{issue.id} - {diseaseName(issue)} ({issue.farmerUsername})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setCreateChatOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateChat}
                disabled={submitting || !chatTitle.trim()}
                className="gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Chat
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ====== Add to Existing Chat Dialog ====== */}
      <Dialog open={addToChatOpen} onOpenChange={setAddToChatOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add to Existing Chat</DialogTitle>
            <DialogDescription>
              Add {selectedIds.size} selected issue
              {selectedIds.size !== 1 && "s"} to an active chat room
              {selectedDisease && (
                <>
                  {" "}
                  for{" "}
                  <span className="font-medium text-foreground">
                    {selectedDisease}
                  </span>
                </>
              )}
              .
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2">
            {existingChats.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  No active chats found
                  {selectedDisease
                    ? ` for "${selectedDisease}"`
                    : ""}
                  . Try creating a new chat instead.
                </p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {existingChats.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => handleAddToChat(chat.id)}
                    disabled={submitting}
                    className="
                      w-full text-left rounded-lg border border-border/60 p-3
                      hover:bg-muted/50 hover:border-primary/30 transition-colors
                      disabled:opacity-50
                    "
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">
                          {chat.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {chat.members?.length ?? 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {chat.linkedIssues?.length ?? 0} issues
                          </span>
                          {chat.diseaseLabel && (
                            <span className="bg-muted/60 px-1.5 py-0.5 rounded">
                              {chat.diseaseLabel}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {submitting ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setAddToChatOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
