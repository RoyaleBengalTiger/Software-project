import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BackButton from "@/components/BackButton";
import { chatRoomsApi, ChatRoom } from "@/api/chatrooms";
import { useAuth } from "@/context/AuthContext";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import {
  RefreshCw,
  Search,
  MessageSquare,
  Users,
  AlertCircle,
  Inbox,
  ChevronRight,
  CalendarDays,
  List,
  UserCheck,
} from "lucide-react";

type SpringPage<T> = { content: T[] };

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function fmt(iso?: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function contains(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function filterRooms(list: ChatRoom[], q: string) {
  const query = q.trim();
  if (!query) return list;
  return list.filter((r) => {
    const blob = [
      String(r.id ?? ""),
      r.title ?? "",
      r.diseaseLabel ?? "",
      r.createdByOfficerUsername ?? "",
      r.status ?? "",
    ]
      .filter(Boolean)
      .join(" ");
    return contains(blob, query);
  });
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: ChatRoom["status"] }) {
  const isActive = status === "ACTIVE";
  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium border ${
        isActive
          ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400"
          : "border-gray-400/40 bg-gray-400/10 text-gray-600 dark:text-gray-400"
      }`}
    >
      {isActive ? "Active" : "Closed"}
    </Badge>
  );
}

function ListSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-28" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-3 w-36" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 p-8 text-center bg-card/30">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted">
        <Inbox className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="font-medium">{title}</div>
      {hint && <div className="mt-1 text-sm text-muted-foreground">{hint}</div>}
    </div>
  );
}

function ChatRoomCard({ room }: { room: ChatRoom }) {
  const memberCount = room.members?.length ?? 0;
  const issueCount = room.linkedIssues?.length ?? 0;

  return (
    <Link to={`/chats/${room.id}`} className="block group">
      <Card className="overflow-hidden transition-colors hover:bg-card/70 active:scale-[0.99]">
        <CardContent className="p-4 space-y-3">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 group-hover:underline">
              {room.title}
            </h3>
            <StatusBadge status={room.status} />
          </div>

          {/* Disease label */}
          {room.diseaseLabel && (
            <Badge variant="secondary" className="rounded-full text-xs">
              {room.diseaseLabel}
            </Badge>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {memberCount} member{memberCount !== 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {issueCount} issue{issueCount !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
            <span className="truncate">
              By <span className="font-medium text-foreground/80">{room.createdByOfficerUsername}</span>
            </span>
            <span className="inline-flex items-center gap-1 shrink-0">
              <CalendarDays className="h-3 w-3" />
              {fmt(room.createdAt)}
            </span>
          </div>

          {/* Chevron hint */}
          <div className="flex justify-end -mt-1">
            <div className="h-7 w-7 rounded-full bg-muted/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Filter config                                                     */
/* ------------------------------------------------------------------ */

type ChatFilter = "my" | "active" | "all";

const FILTER_OPTIONS: {
  key: ChatFilter;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "my", label: "My Chats", icon: <UserCheck className="h-3.5 w-3.5" /> },
  { key: "active", label: "Active", icon: <MessageSquare className="h-3.5 w-3.5" /> },
  { key: "all", label: "All Chats", icon: <List className="h-3.5 w-3.5" /> },
];

/* ------------------------------------------------------------------ */
/*  Main page                                                         */
/* ------------------------------------------------------------------ */

export default function ChatRoomsPage() {
  const { user } = useAuth();

  const [allRooms, setAllRooms] = useState<ChatRoom[]>([]);
  const [myRooms, setMyRooms] = useState<ChatRoom[]>([]);
  const [activeRooms, setActiveRooms] = useState<ChatRoom[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ChatFilter>("my");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allRes, myRes, activeRes] = await Promise.all([
        chatRoomsApi.list(0, 50) as Promise<SpringPage<ChatRoom>>,
        chatRoomsApi.mine(0, 50) as Promise<SpringPage<ChatRoom>>,
        chatRoomsApi.active(0, 50) as Promise<SpringPage<ChatRoom>>,
      ]);
      setAllRooms(allRes.content ?? []);
      setMyRooms(myRes.content ?? []);
      setActiveRooms(activeRes.content ?? []);
    } catch (err) {
      console.error("Failed to load chat rooms", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const filtered = useMemo(
    () => ({
      all: filterRooms(allRooms, search),
      my: filterRooms(myRooms, search),
      active: filterRooms(activeRooms, search),
    }),
    [allRooms, myRooms, activeRooms, search],
  );

  const counts: Record<ChatFilter, number> = {
    my: filtered.my.length,
    active: filtered.active.length,
    all: filtered.all.length,
  };

  const currentList = useMemo(() => {
    if (filter === "my") return filtered.my;
    if (filter === "active") return filtered.active;
    return filtered.all;
  }, [filter, filtered]);

  const emptyHints: Record<ChatFilter, { title: string; hint: string }> = {
    my: {
      title: search ? "No results in My Chats" : "No chats you belong to",
      hint: search ? "Try a different keyword." : "Join a chat room to see it here.",
    },
    active: {
      title: search ? "No results in Active" : "No active chat rooms",
      hint: search ? "Try a different keyword." : "Active chat rooms will appear here.",
    },
    all: {
      title: search ? "No results" : "No chat rooms yet",
      hint: search ? "Try a different keyword." : "Chat rooms will appear here once created.",
    },
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-6">
      {/* Header */}
      <div className="sticky top-0 z-20 -mx-3 sm:-mx-4 px-3 sm:px-4 py-3 bg-background/85 backdrop-blur border-b border-border/60">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <BackButton className="-ml-2 mb-1" />
            <h1 className="text-lg sm:text-2xl font-semibold truncate flex items-center gap-2">
              <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Chat Rooms
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
              Browse and join chat rooms to collaborate on disease issues.
            </p>
          </div>
        </div>

        {/* Search + refresh */}
        <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative w-full sm:w-[360px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, disease, officer..."
              className="pl-9"
            />
          </div>

          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Filter buttons */}
        <div className="mt-3 flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? "default" : "outline"}
              onClick={() => setFilter(f.key)}
              className="gap-1.5"
            >
              {f.icon}
              {f.label}
              <Badge
                variant={filter === f.key ? "secondary" : "outline"}
                className="ml-1 px-1.5 py-0 rounded-full text-[10px] min-w-[20px] text-center"
              >
                {counts[f.key]}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mt-4 sm:mt-6">
        {loading ? (
          <ListSkeleton />
        ) : currentList.length === 0 ? (
          <EmptyState
            title={emptyHints[filter].title}
            hint={emptyHints[filter].hint}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {currentList.map((room) => (
              <ChatRoomCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
