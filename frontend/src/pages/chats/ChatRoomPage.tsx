import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import BackButton from "@/components/BackButton";
import { chatRoomsApi, ChatRoom, ChatMessage, ChatMember } from "@/api/chatrooms";
import { issuesApi } from "@/api/issues";
import { useAuth } from "@/context/AuthContext";
import IssueDetailModal from "@/components/IssueDetailModal";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Info,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Users,
  Lock,
  LinkIcon,
  XCircle,
  Forward,
  Loader2,
  Bot,
  Inbox,
  Unlink,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function formatTime(iso?: string | null) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function roleBadgeVariant(role: string) {
  switch (role) {
    case "OFFICER":
      return "default";
    case "ADMIN":
      return "destructive";
    case "FARMER":
      return "secondary";
    case "AI_ASSISTANT":
      return "outline";
    default:
      return "outline";
  }
}

function statusColor(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-green-500/15 text-green-700 border-green-500/30";
    case "CLOSED":
      return "bg-muted/50 text-muted-foreground border-border";
    default:
      return "bg-muted/30";
  }
}

function issueStatusColor(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-yellow-500/15 text-yellow-700";
    case "REVIEWING":
      return "bg-blue-500/15 text-blue-700";
    case "RESOLVED":
      return "bg-green-500/15 text-green-700";
    default:
      return "bg-muted/30";
  }
}

/* ------------------------------------------------------------------ */
/*  Chat Room Info Panel (sidebar / sheet)                            */
/* ------------------------------------------------------------------ */

function ChatRoomInfoPanel({
  room,
  isMember,
  canClose,
  canTransfer,
  canRemoveIssue,
  onClose,
  onIssueClick,
  onTransfer,
  onRemoveIssue,
  transferring,
}: {
  room: ChatRoom | null;
  isMember: boolean;
  canClose: boolean;
  canTransfer: boolean;
  canRemoveIssue: boolean;
  onClose: () => void;
  onIssueClick: (issueId: number) => void;
  onTransfer: (toOfficerUsername: string) => void;
  onRemoveIssue: (issueId: number, reassignTo?: string) => void;
  transferring: boolean;
}) {
  if (!room) return null;

  const members = room.members ?? [];
  const linkedIssues = room.linkedIssues ?? [];

  const [officers, setOfficers] = useState<{ username: string }[]>([]);
  const [selectedOfficer, setSelectedOfficer] = useState("");
  const [showTransfer, setShowTransfer] = useState(false);

  // Remove-issue state: which issue is being actioned, and the reassign officer selector
  const [removeIssueId, setRemoveIssueId] = useState<number | null>(null);
  const [reassignOfficer, setReassignOfficer] = useState("");
  const [removeOfficers, setRemoveOfficers] = useState<{ username: string }[]>([]);
  const [removingIssueId, setRemovingIssueId] = useState<number | null>(null);

  useEffect(() => {
    if (showTransfer && officers.length === 0) {
      issuesApi.listGovtOfficers().then((list) => {
        const currentOfficerUsernames = new Set(
          members.filter((m) => m.roleInChat === "OFFICER" || m.roleInChat === "ADMIN").map((m) => m.username)
        );
        setOfficers(list.filter((o) => !currentOfficerUsernames.has(o.username)));
      });
    }
  }, [showTransfer]);

  // Fetch officers list when the remove-issue panel opens
  useEffect(() => {
    if (removeIssueId != null && removeOfficers.length === 0) {
      issuesApi.listGovtOfficers().then((list) => setRemoveOfficers(list));
    }
  }, [removeIssueId]);

  const handleRemoveToPool = async (issueId: number) => {
    setRemovingIssueId(issueId);
    try {
      await onRemoveIssue(issueId);
      setRemoveIssueId(null);
      setReassignOfficer("");
    } finally {
      setRemovingIssueId(null);
    }
  };

  const handleRemoveReassign = async (issueId: number) => {
    if (!reassignOfficer) return;
    setRemovingIssueId(issueId);
    try {
      await onRemoveIssue(issueId, reassignOfficer);
      setRemoveIssueId(null);
      setReassignOfficer("");
    } finally {
      setRemovingIssueId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="text-base font-semibold truncate">{room.title}</div>
          <span
            className={`text-xs rounded-full px-2 py-1 border ${statusColor(
              room.status
            )}`}
          >
            {room.status}
          </span>
        </div>
        {room.diseaseLabel && (
          <div className="text-sm text-muted-foreground">
            Disease: {room.diseaseLabel}
          </div>
        )}
      </div>

      {/* Chat details */}
      <div className="rounded-xl border border-border/50 p-3 space-y-1">
        <div className="text-xs text-muted-foreground">Details</div>
        <div className="text-sm">
          <span className="text-muted-foreground">Created by: </span>
          {room.createdByOfficerUsername}
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Created: </span>
          {formatTime(room.createdAt) || "\u2014"}
        </div>
        {room.updatedAt && (
          <div className="text-sm">
            <span className="text-muted-foreground">Updated: </span>
            {formatTime(room.updatedAt)}
          </div>
        )}
      </div>

      {/* Membership status */}
      <div className="rounded-xl border border-border/50 p-3">
        <div className="text-xs text-muted-foreground mb-1">Your status</div>
        {isMember ? (
          <Badge variant="default" className="text-xs">
            Member
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            Read-only
          </Badge>
        )}
      </div>

      {/* Members */}
      <div className="rounded-xl border border-border/50 p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">
            Members ({members.length})
          </div>
        </div>

        {members.length === 0 ? (
          <div className="text-sm text-muted-foreground">No members found.</div>
        ) : (
          <div className="space-y-1.5">
            {members.map((m) => (
              <div
                key={m.userId}
                className="flex items-center justify-between gap-2"
              >
                <div className="text-sm font-medium truncate flex items-center gap-1.5">
                  {m.roleInChat === "AI_ASSISTANT" && (
                    <Bot className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                  )}
                  {m.username}
                </div>
                <Badge
                  variant={
                    roleBadgeVariant(m.roleInChat) as
                      | "default"
                      | "secondary"
                      | "destructive"
                      | "outline"
                  }
                  className={`text-[10px] shrink-0 ${
                    m.roleInChat === "AI_ASSISTANT"
                      ? "border-violet-500/50 text-violet-600"
                      : ""
                  }`}
                >
                  {m.roleInChat === "AI_ASSISTANT" ? "AI" : m.roleInChat}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Linked Issues */}
      {linkedIssues.length > 0 && (
        <div className="rounded-xl border border-border/50 p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="text-xs text-muted-foreground">
              Linked Issues ({linkedIssues.length})
            </div>
          </div>

          <div className="space-y-1.5">
            {linkedIssues.map((issue) => (
              <div key={issue.issueId}>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onIssueClick(issue.issueId)}
                    className="flex-1 text-left rounded-lg border border-border/50 p-2 hover:bg-muted/30 transition-colors"
                  >
                    <div className="text-sm font-medium truncate">
                      #{issue.issueId} &mdash;{" "}
                      {issue.predictedDisease || "Unknown"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Farmer: {issue.farmerUsername}
                    </div>
                  </button>
                  {canRemoveIssue && room.status === "ACTIVE" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      title="Remove from chat"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRemoveIssueId(
                          removeIssueId === issue.issueId ? null : issue.issueId
                        );
                        setReassignOfficer("");
                      }}
                    >
                      <Unlink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {/* Remove / Reassign panel */}
                {removeIssueId === issue.issueId && (
                  <div className="mt-1.5 ml-1 rounded-lg border border-border/50 p-2.5 space-y-2 bg-muted/20">
                    <div className="text-xs font-medium">
                      Remove Issue #{issue.issueId} from chat
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5 text-xs"
                      disabled={removingIssueId === issue.issueId}
                      onClick={() => handleRemoveToPool(issue.issueId)}
                    >
                      {removingIssueId === issue.issueId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Inbox className="h-3 w-3" />
                      )}
                      Send to Pool
                    </Button>

                    <div className="text-xs text-muted-foreground text-center">
                      or reassign to an officer
                    </div>

                    <Select
                      value={reassignOfficer}
                      onValueChange={setReassignOfficer}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select officer..." />
                      </SelectTrigger>
                      <SelectContent>
                        {removeOfficers.map((o) => (
                          <SelectItem key={o.username} value={o.username}>
                            {o.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        disabled={removingIssueId === issue.issueId}
                        onClick={() => {
                          setRemoveIssueId(null);
                          setReassignOfficer("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5 text-xs"
                        disabled={
                          !reassignOfficer ||
                          removingIssueId === issue.issueId
                        }
                        onClick={() =>
                          handleRemoveReassign(issue.issueId)
                        }
                      >
                        {removingIssueId === issue.issueId ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Forward className="h-3 w-3" />
                        )}
                        Reassign
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transfer chat */}
      {canTransfer && room.status === "ACTIVE" && (
        <div className="rounded-xl border border-border/50 p-3 space-y-2">
          <div className="text-xs text-muted-foreground">Transfer Chat</div>
          {!showTransfer ? (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowTransfer(true)}
            >
              <Forward className="h-4 w-4" />
              Forward to Another Officer
            </Button>
          ) : (
            <div className="space-y-2">
              <Select value={selectedOfficer} onValueChange={setSelectedOfficer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select officer..." />
                </SelectTrigger>
                <SelectContent>
                  {officers.map((o) => (
                    <SelectItem key={o.username} value={o.username}>
                      {o.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowTransfer(false);
                    setSelectedOfficer("");
                  }}
                  disabled={transferring}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gap-1.5"
                  disabled={!selectedOfficer || transferring}
                  onClick={() => onTransfer(selectedOfficer)}
                >
                  {transferring && <Loader2 className="h-3 w-3 animate-spin" />}
                  Transfer
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Close chat button */}
      {canClose && room.status === "ACTIVE" && (
        <Button
          variant="outline"
          className="w-full gap-2 text-destructive hover:text-destructive"
          onClick={onClose}
        >
          <XCircle className="h-4 w-4" />
          Close Chat
        </Button>
      )}

      {room.status === "CLOSED" && (
        <div className="flex items-center gap-2 rounded-xl border border-border/50 p-3 text-sm text-muted-foreground">
          <Lock className="h-4 w-4 shrink-0" />
          This chat room has been closed.
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page component                                               */
/* ------------------------------------------------------------------ */

export default function ChatRoomPage() {
  const { id } = useParams();
  const roomId = Number(id);
  const navigate = useNavigate();

  const { user, isGovtOfficer, isAdmin } = useAuth();

  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [targetOllama, setTargetOllama] = useState(false);

  const [infoCollapsed, setInfoCollapsed] = useState(false);

  // Issue detail modal
  const [modalIssueId, setModalIssueId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const openIssueModal = useCallback((issueId: number) => {
    setModalIssueId(issueId);
    setModalOpen(true);
  }, []);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  /* ---- Derived state ---- */
  const isClosed = room?.status === "CLOSED";

  const isMember =
    !!user &&
    (room?.members ?? []).some(
      (m: ChatMember) => m.username === user.username && m.roleInChat !== "AI_ASSISTANT"
    );

  const canClose = isMember && (isGovtOfficer || isAdmin) && !isClosed;

  const canTransfer = isMember && (isGovtOfficer || isAdmin) && !isClosed;

  const canRemoveIssue = isMember && (isGovtOfficer || isAdmin) && !isClosed;

  const canSend = isMember && !isClosed;

  /* ---- Data loading ---- */
  const load = useCallback(async () => {
    if (!roomId || isNaN(roomId)) return;

    try {
      const [roomRes, msgRes] = await Promise.all([
        chatRoomsApi.getById(roomId),
        chatRoomsApi.messages(roomId, 0, 200),
      ]);
      setRoom(roomRes);
      setMessages(msgRes.content ?? []);
    } catch (err) {
      console.error("Failed to load chat room:", err);
    }
  }, [roomId]);

  // Initial load + polling
  useEffect(() => {
    if (!roomId || isNaN(roomId)) return;

    let cancelled = false;

    (async () => {
      try {
        await load();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const interval = window.setInterval(() => {
      load().catch(() => {});
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  /* ---- Actions ---- */
  const sendMessage = async () => {
    const content = text.trim();
    if (!content || !canSend) return;

    const isAiTarget = targetOllama;
    setSending(true);
    setText("");
    try {
      await chatRoomsApi.sendMessage(roomId, content, isAiTarget);
      await load();
    } catch (err) {
      console.error("Failed to send message:", err);
      setText(content); // restore on failure
    } finally {
      setSending(false);
    }
  };

  const closeChat = async () => {
    if (!canClose) return;
    try {
      const updated = await chatRoomsApi.close(roomId);
      setRoom(updated);
      await load();
    } catch (err) {
      console.error("Failed to close chat:", err);
    }
  };

  const handleTransfer = async (toOfficerUsername: string) => {
    if (!canTransfer) return;
    setTransferring(true);
    try {
      await chatRoomsApi.transfer(roomId, toOfficerUsername);
      // After transfer, current officer is no longer a member.
      // Navigate back to chats list.
      navigate("/chats");
    } catch (err) {
      console.error("Failed to transfer chat:", err);
    } finally {
      setTransferring(false);
    }
  };

  const handleRemoveIssue = async (issueId: number, reassignTo?: string) => {
    if (!canRemoveIssue) return;
    try {
      await chatRoomsApi.removeIssue(roomId, issueId, reassignTo);
      await load();
    } catch (err) {
      console.error("Failed to remove issue:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ---- Render ---- */
  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 h-[calc(100dvh-65px)]">
      <div
        className={[
          "h-full grid gap-4 overflow-hidden",
          infoCollapsed
            ? "grid-cols-1"
            : "grid-cols-1 lg:grid-cols-[1fr_340px]",
        ].join(" ")}
      >
        {/* LEFT: Chat (mobile + desktop) */}
        <Card className="border-border/50 flex flex-col h-full min-w-0 overflow-hidden">
          {/* Chat header */}
          <CardHeader className="border-b border-border/50 py-2 px-3 sm:py-3 sm:px-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <BackButton className="-ml-2 h-7 px-2 text-xs" />
                  <div className="font-medium truncate">
                    {room?.title ?? "Chat Room"}
                  </div>
                  <div className="hidden sm:block">
                    {room && (
                      <span
                        className={`text-xs rounded-full px-2 py-1 border ${statusColor(
                          room.status
                        )}`}
                      >
                        {room.status}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {room?.diseaseLabel
                    ? `Disease: ${room.diseaseLabel}`
                    : `Room #${roomId}`}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Read-only badge */}
                {!isMember && room && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    Read-only
                  </Badge>
                )}

                {/* Status hint (desktop) */}
                <div className="text-xs text-muted-foreground hidden sm:block">
                  {isClosed
                    ? "Chat closed"
                    : !isMember
                    ? "Viewing"
                    : "Live"}
                </div>

                {/* Desktop collapse toggle (lg+) */}
                <div className="hidden lg:block">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setInfoCollapsed((v) => !v)}
                    title={infoCollapsed ? "Show info" : "Hide info"}
                  >
                    {infoCollapsed ? (
                      <PanelLeftOpen className="h-4 w-4" />
                    ) : (
                      <PanelLeftClose className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Mobile Info button (opens sheet) */}
                <div className="lg:hidden">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent
                      side="right"
                      className="w-[92vw] sm:w-[420px] overflow-y-auto"
                    >
                      <SheetHeader className="mb-4">
                        <SheetTitle>Chat Room Info</SheetTitle>
                      </SheetHeader>
                      <ChatRoomInfoPanel
                        room={room}
                        isMember={isMember}
                        canClose={canClose}
                        canTransfer={canTransfer}
                        canRemoveIssue={canRemoveIssue}
                        onClose={closeChat}
                        onIssueClick={openIssueModal}
                        onTransfer={handleTransfer}
                        onRemoveIssue={handleRemoveIssue}
                        transferring={transferring}
                      />
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </div>

            {/* Mobile-only status row */}
            <div className="text-[11px] text-muted-foreground sm:hidden mt-1 leading-tight">
              {isClosed ? "Chat closed" : !isMember ? "Viewing" : "Live"}{" "}
              <span className="mx-1">&bull;</span>
              {room && (
                <span
                  className={`text-xs rounded-full px-2 py-0.5 border ${statusColor(
                    room.status
                  )}`}
                >
                  {room.status}
                </span>
              )}
            </div>
          </CardHeader>

          {/* Messages area */}
          <CardContent className="flex-1 p-0 overflow-hidden">
            <div className="h-full overflow-y-auto px-4 py-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-sm text-muted-foreground">
                    Loading messages...
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-sm text-muted-foreground">
                    No messages yet. Start the conversation!
                  </div>
                </div>
              ) : (
                messages.map((m) => {
                  const isSystem = m.type === "SYSTEM";
                  const isAi = m.type === "AI_RESPONSE" || m.senderType === "AI";
                  const mine =
                    !isSystem && !isAi && m.senderUsername === user?.username;

                  // SYSTEM messages
                  if (isSystem) {
                    return (
                      <div
                        key={m.id}
                        className="flex justify-center"
                      >
                        <div className="max-w-[90%] sm:max-w-[70%] text-center">
                          <div className="rounded-xl px-4 py-2 text-xs bg-muted/40 text-muted-foreground border border-border/30">
                            {m.content}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {formatTime(m.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // AI messages — always left-aligned with distinct styling
                  if (isAi) {
                    return (
                      <div
                        key={m.id}
                        className="flex justify-start"
                      >
                        <div className="max-w-[88%] sm:max-w-[70%] space-y-1">
                          <div className="text-[11px] text-muted-foreground ml-1 flex items-center gap-1.5">
                            <Bot className="h-3 w-3 text-violet-500" />
                            <span className="font-medium text-violet-600">
                              Ollama
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 h-4 border-violet-500/50 text-violet-600"
                            >
                              AI
                            </Badge>
                          </div>

                          <div className="rounded-2xl px-4 py-2 text-sm border border-violet-500/30 bg-violet-50/50 dark:bg-violet-950/20">
                            <div className="whitespace-pre-wrap break-words">
                              {m.content}
                            </div>
                          </div>

                          <div className="text-[11px] text-muted-foreground text-left">
                            Ollama
                            {m.createdAt
                              ? ` \u2022 ${formatTime(m.createdAt)}`
                              : ""}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // User messages (original logic)
                  return (
                    <div
                      key={m.id}
                      className={`flex ${
                        mine ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div className="max-w-[88%] sm:max-w-[70%] space-y-1">
                        {/* Sender name (only for other users) */}
                        {!mine && (
                          <div className="text-[11px] text-muted-foreground ml-1 flex items-center gap-1.5">
                            <span className="font-medium">
                              {m.senderUsername}
                            </span>
                            {m.senderRole && (
                              <Badge
                                variant={
                                  roleBadgeVariant(m.senderRole) as
                                    | "default"
                                    | "secondary"
                                    | "destructive"
                                    | "outline"
                                }
                                className="text-[9px] px-1.5 py-0 h-4"
                              >
                                {m.senderRole}
                              </Badge>
                            )}
                          </div>
                        )}

                        <div
                          className={`rounded-2xl px-4 py-2 text-sm border border-border/50 ${
                            mine
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/30"
                          }`}
                        >
                          <div className="whitespace-pre-wrap break-words">
                            {m.content}
                          </div>
                        </div>

                        <div
                          className={`text-[11px] text-muted-foreground ${
                            mine ? "text-right" : "text-left"
                          }`}
                        >
                          {mine ? "You" : m.senderUsername}
                          {m.targetType === "OLLAMA" && (
                            <span className="text-violet-500"> (to Ollama)</span>
                          )}
                          {m.createdAt
                            ? ` \u2022 ${formatTime(m.createdAt)}`
                            : ""}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              <div ref={bottomRef} />
            </div>
          </CardContent>

          {/* Composer */}
          <div className="border-t border-border/50 p-2 sm:p-3">
            {canSend ? (
              <>
                {/* Target selector */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] text-muted-foreground">Send to:</span>
                  <button
                    type="button"
                    onClick={() => setTargetOllama(false)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      !targetOllama
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50"
                    }`}
                  >
                    Everyone
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetOllama(true)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                      targetOllama
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50"
                    }`}
                  >
                    <Bot className="h-3 w-3" />
                    Ollama
                  </button>
                </div>

                <div className="flex gap-2 items-end">
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      targetOllama
                        ? "Ask Ollama a question..."
                        : "Write a message..."
                    }
                    disabled={sending}
                    className={`min-h-[44px] max-h-[160px] ${
                      targetOllama ? "border-violet-500/50 focus-visible:ring-violet-500/30" : ""
                    }`}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!text.trim() || sending}
                    className={`h-[44px] gap-1.5 ${
                      targetOllama ? "bg-violet-600 hover:bg-violet-700" : ""
                    }`}
                  >
                    {sending && targetOllama ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send
                  </Button>
                </div>
                <div className="text-[11px] text-muted-foreground mt-2">
                  {targetOllama
                    ? "Your question will be sent to Ollama AI. Press Enter to send."
                    : "Press Enter to send, Shift+Enter for a new line."}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                {isClosed
                  ? "This chat room has been closed."
                  : "You are not a member of this chat room."}
              </div>
            )}
          </div>
        </Card>

        {/* RIGHT: Sidebar (desktop only) */}
        {!infoCollapsed && (
          <Card className="border-border/50 h-full overflow-hidden hidden lg:flex lg:flex-col">
            <CardHeader className="border-b border-border/50 py-3 px-4">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Chat Room Info</span>
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto">
              <ChatRoomInfoPanel
                room={room}
                isMember={isMember}
                canClose={canClose}
                canTransfer={canTransfer}
                canRemoveIssue={canRemoveIssue}
                onClose={closeChat}
                onIssueClick={openIssueModal}
                onTransfer={handleTransfer}
                onRemoveIssue={handleRemoveIssue}
                transferring={transferring}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Issue Detail Modal */}
      <IssueDetailModal
        issueId={modalIssueId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
