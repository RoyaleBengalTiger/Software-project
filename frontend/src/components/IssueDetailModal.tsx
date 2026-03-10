import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { issuesApi, Issue, IssueStatus } from "@/api/issues";
import { buildFileUrl } from "@/api/util";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  User,
  Calendar,
  Leaf,
  ArrowRightLeft,
  CheckCircle2,
  MessageSquare,
  Loader2,
  Image as ImageIcon,
  Shield,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Pencil,
  Save,
  X,
  Inbox,
} from "lucide-react";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  NEW: { label: "New", color: "text-blue-700", bg: "bg-blue-100 border-blue-300" },
  UNDER_REVIEW: { label: "Under Review", color: "text-amber-700", bg: "bg-amber-100 border-amber-300" },
  GROUPED_IN_CHAT: { label: "In Chat", color: "text-green-700", bg: "bg-green-100 border-green-300" },
  RESOLVED: { label: "Resolved", color: "text-emerald-700", bg: "bg-emerald-100 border-emerald-300" },
  CLOSED: { label: "Closed", color: "text-gray-700", bg: "bg-gray-100 border-gray-300" },
};

const ALL_STATUSES: { value: IssueStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "GROUPED_IN_CHAT", label: "In Chat" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

interface IssueDetailModalProps {
  issueId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIssueUpdated?: () => void;
}

export default function IssueDetailModal({
  issueId,
  open,
  onOpenChange,
  onIssueUpdated,
}: IssueDetailModalProps) {
  const { user, isGovtOfficer, isAdmin } = useAuth();
  const { toast } = useToast();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showForwardUI, setShowForwardUI] = useState(false);
  const [officers, setOfficers] = useState<{ username: string; identificationNumber?: string | null }[]>([]);
  const [targetOfficer, setTargetOfficer] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // ─── Edit mode state ───
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    predictedDisease: "",
    reviewedDisease: "",
    cropName: "",
    confidence: "",
    note: "",
    status: "" as IssueStatus | "",
    locationText: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchIssue = useCallback(async () => {
    if (!issueId) return;
    setLoading(true);
    try {
      const data = await issuesApi.getById(issueId);
      setIssue(data);
    } catch {
      toast({ title: "Error", description: "Failed to load issue details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [issueId, toast]);

  useEffect(() => {
    if (open && issueId) {
      fetchIssue();
      setShowForwardUI(false);
      setTargetOfficer("");
      setPreviewImage(null);
      setEditing(false);
    }
    if (!open) {
      setIssue(null);
      setEditing(false);
    }
  }, [open, issueId, fetchIssue]);

  // Populate edit form when entering edit mode
  const startEditing = useCallback(() => {
    if (!issue) return;
    setEditData({
      predictedDisease: issue.predictedDisease || "",
      reviewedDisease: issue.reviewedDisease || "",
      cropName: issue.cropName || "",
      confidence: issue.confidence != null ? String(Math.round(issue.confidence * 100)) : "",
      note: issue.note || "",
      status: issue.status,
      locationText: issue.locationText || "",
    });
    setEditing(true);
  }, [issue]);

  const cancelEditing = () => {
    setEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!issue) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (editData.predictedDisease !== (issue.predictedDisease || ""))
        payload.predictedDisease = editData.predictedDisease;
      if (editData.reviewedDisease !== (issue.reviewedDisease || ""))
        payload.reviewedDisease = editData.reviewedDisease;
      if (editData.cropName !== (issue.cropName || ""))
        payload.cropName = editData.cropName;
      const origConf = issue.confidence != null ? String(Math.round(issue.confidence * 100)) : "";
      if (editData.confidence !== origConf) {
        const parsed = parseFloat(editData.confidence);
        if (!isNaN(parsed)) payload.confidence = parsed / 100;
      }
      if (editData.note !== (issue.note || ""))
        payload.note = editData.note;
      if (editData.status && editData.status !== issue.status)
        payload.status = editData.status;
      if (editData.locationText !== (issue.locationText || ""))
        payload.locationText = editData.locationText;

      if (Object.keys(payload).length === 0) {
        setEditing(false);
        return;
      }

      await issuesApi.editIssue(issue.id, payload as any);
      toast({ title: "Issue Updated", description: "Changes saved successfully" });
      onIssueUpdated?.();
      setEditing(false);
      await fetchIssue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save changes";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAccept = async () => {
    if (!issue) return;
    setActionLoading(true);
    try {
      await issuesApi.assignToSelf(issue.id);
      toast({ title: "Issue Accepted", description: `You are now assigned to issue #${issue.id}` });
      onIssueUpdated?.();
      await fetchIssue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to accept issue";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleShowForward = async () => {
    setShowForwardUI(true);
    try {
      const list = await issuesApi.listGovtOfficers();
      setOfficers(list);
    } catch {
      toast({ title: "Error", description: "Failed to load officers", variant: "destructive" });
    }
  };

  const handleForward = async () => {
    if (!issue || !targetOfficer) return;
    setActionLoading(true);
    try {
      await issuesApi.forward(issue.id, targetOfficer);
      toast({ title: "Issue Forwarded", description: `Forwarded to ${targetOfficer}` });
      onIssueUpdated?.();
      setShowForwardUI(false);
      setTargetOfficer("");
      await fetchIssue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to forward issue";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleForwardToPool = async () => {
    if (!issue) return;
    setActionLoading(true);
    try {
      await issuesApi.forwardToPool(issue.id);
      toast({ title: "Sent to Pool", description: `Issue #${issue.id} is now in the open pool` });
      onIssueUpdated?.();
      await fetchIssue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send to pool";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (d?: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleString();
  };

  const statusCfg = issue ? STATUS_CONFIG[issue.status] || STATUS_CONFIG.NEW : STATUS_CONFIG.NEW;
  const isAssignedToMe = issue?.assignedOfficerUsername === user?.username;
  const canAccept = (isGovtOfficer || isAdmin) && issue && !issue.assignedOfficerUsername;
  const canForward = (isGovtOfficer || isAdmin) && issue && isAssignedToMe;
  const canEdit = (isGovtOfficer || isAdmin) && issue;
  const canForwardToPool = (isGovtOfficer || isAdmin) && issue && issue.assignedOfficerUsername &&
    issue.status !== "CLOSED" && issue.status !== "RESOLVED";

  const parsedAdvice = useMemo(() => {
    if (!issue?.aiAdvice) return null;
    try {
      return JSON.parse(issue.aiAdvice) as {
        summary?: string;
        immediateActions?: string[];
        prevention?: string[];
        whyThisHappens?: string[];
        whenToEscalate?: string;
        summaryBn?: string;
        immediateActionsBn?: string[];
        preventionBn?: string[];
        whyThisHappensBn?: string[];
        whenToEscalateBn?: string;
      };
    } catch {
      return null;
    }
  }, [issue?.aiAdvice]);

  const [adviceLang, setAdviceLang] = useState<"en" | "bn">("en");

  const inputClass = "w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 gap-0">
        {loading || !issue ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Header */}
            <DialogHeader className="px-6 pt-6 pb-3">
              <div className="flex items-center gap-3">
                <DialogTitle className="text-lg font-semibold">
                  Issue #{issue.id}
                </DialogTitle>
                <Badge variant="outline" className={`${statusCfg.bg} ${statusCfg.color} border text-xs`}>
                  {statusCfg.label}
                </Badge>
                <div className="flex-1" />
                {canEdit && !editing && (
                  <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={startEditing}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                )}
                {editing && (
                  <div className="flex gap-1.5">
                    <Button size="sm" className="gap-1.5 h-8" onClick={handleSaveEdit} disabled={saving}>
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={cancelEditing} disabled={saving}>
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
              {!editing && (
                <p className="text-base font-medium text-foreground mt-1">
                  {issue.reviewedDisease || issue.predictedDisease}
                </p>
              )}
            </DialogHeader>

            <Separator />

            <ScrollArea className="max-h-[60vh] px-6 py-4">
              <div className="space-y-5">

                {/* ═══ EDIT MODE ═══ */}
                {editing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Predicted Disease</label>
                        <input
                          className={inputClass}
                          value={editData.predictedDisease}
                          onChange={(e) => setEditData((d) => ({ ...d, predictedDisease: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Reviewed Disease</label>
                        <input
                          className={inputClass}
                          value={editData.reviewedDisease}
                          onChange={(e) => setEditData((d) => ({ ...d, reviewedDisease: e.target.value }))}
                          placeholder="Officer's diagnosis..."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Crop Name</label>
                        <input
                          className={inputClass}
                          value={editData.cropName}
                          onChange={(e) => setEditData((d) => ({ ...d, cropName: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Confidence (%)</label>
                        <input
                          className={inputClass}
                          type="number"
                          min="0"
                          max="100"
                          value={editData.confidence}
                          onChange={(e) => setEditData((d) => ({ ...d, confidence: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Status</label>
                        <Select
                          value={editData.status}
                          onValueChange={(v) => setEditData((d) => ({ ...d, status: v as IssueStatus }))}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_STATUSES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Location Text</label>
                        <input
                          className={inputClass}
                          value={editData.locationText}
                          onChange={(e) => setEditData((d) => ({ ...d, locationText: e.target.value }))}
                          placeholder="e.g. Dhaka, Bangladesh"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Note</label>
                      <textarea
                        className={`${inputClass} min-h-[80px] resize-none`}
                        value={editData.note}
                        onChange={(e) => setEditData((d) => ({ ...d, note: e.target.value }))}
                        placeholder="Additional notes..."
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* ═══ VIEW MODE (existing UI) ═══ */}

                    {/* Images */}
                    {issue.imageUrls && issue.imageUrls.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                          <ImageIcon className="h-3.5 w-3.5" /> Photos ({issue.imageUrls.length})
                        </h4>
                        {previewImage ? (
                          <div className="relative">
                            <img
                              src={buildFileUrl(previewImage) ?? ""}
                              alt="Issue"
                              className="w-full max-h-64 object-contain rounded-lg border bg-muted"
                            />
                            <Button
                              size="sm"
                              variant="secondary"
                              className="absolute top-2 right-2"
                              onClick={() => setPreviewImage(null)}
                            >
                              Close
                            </Button>
                            <div className="flex justify-center gap-2 mt-2">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                                onClick={() => {
                                  const idx = issue.imageUrls!.indexOf(previewImage);
                                  if (idx > 0) setPreviewImage(issue.imageUrls![idx - 1]);
                                }}
                                disabled={issue.imageUrls!.indexOf(previewImage) === 0}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                                onClick={() => {
                                  const idx = issue.imageUrls!.indexOf(previewImage);
                                  if (idx < issue.imageUrls!.length - 1) setPreviewImage(issue.imageUrls![idx + 1]);
                                }}
                                disabled={issue.imageUrls!.indexOf(previewImage) === issue.imageUrls!.length - 1}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {issue.imageUrls.map((url, i) => (
                              <img
                                key={i}
                                src={buildFileUrl(url) ?? ""}
                                alt={`Issue #${issue.id} photo ${i + 1}`}
                                className="h-20 w-20 object-cover rounded-md border cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all flex-shrink-0"
                                onClick={() => setPreviewImage(url)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Disease Info */}
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Leaf className="h-3.5 w-3.5" /> Disease Info
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-2.5 rounded-md bg-muted/50 border">
                          <p className="text-xs text-muted-foreground">Predicted Disease</p>
                          <p className="text-sm font-medium">{issue.predictedDisease}</p>
                        </div>
                        {issue.reviewedDisease && (
                          <div className="p-2.5 rounded-md bg-muted/50 border">
                            <p className="text-xs text-muted-foreground">Reviewed Disease</p>
                            <p className="text-sm font-medium">{issue.reviewedDisease}</p>
                          </div>
                        )}
                        {issue.confidence != null && (
                          <div className="p-2.5 rounded-md bg-muted/50 border">
                            <p className="text-xs text-muted-foreground">Confidence</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${Math.round(issue.confidence * 100)}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">
                                {Math.round(issue.confidence * 100)}%
                              </span>
                            </div>
                          </div>
                        )}
                        {issue.cropName && (
                          <div className="p-2.5 rounded-md bg-muted/50 border">
                            <p className="text-xs text-muted-foreground">Crop</p>
                            <p className="text-sm font-medium">{issue.cropName}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> Location
                      </h4>
                      <div className="p-2.5 rounded-md bg-muted/50 border">
                        {issue.locationText && <p className="text-sm font-medium">{issue.locationText}</p>}
                        <p className="text-xs text-muted-foreground">
                          {issue.latitude.toFixed(5)}, {issue.longitude.toFixed(5)}
                        </p>
                        <Link
                          to={`/map?lat=${issue.latitude}&lng=${issue.longitude}`}
                          className="text-xs text-primary hover:underline mt-1 inline-block"
                        >
                          View on Map
                        </Link>
                      </div>
                    </div>

                    {/* People */}
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" /> People
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-2.5 rounded-md bg-muted/50 border">
                          <p className="text-xs text-muted-foreground">Created by</p>
                          <p className="text-sm font-medium">{issue.farmerUsername}</p>
                        </div>
                        <div className="p-2.5 rounded-md bg-muted/50 border">
                          <p className="text-xs text-muted-foreground">Assigned Officer</p>
                          <p className="text-sm font-medium">
                            {issue.assignedOfficerUsername || (
                              <span className="text-muted-foreground italic">Unassigned (Pool)</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Note */}
                    {issue.note && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Note</h4>
                        <div className="p-2.5 rounded-md bg-muted/50 border text-sm whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {issue.note}
                        </div>
                      </div>
                    )}

                    {/* AI Advice */}
                    {parsedAdvice && (() => {
                      const hasBn = !!parsedAdvice.summaryBn;
                      const isBn = adviceLang === "bn" && hasBn;
                      const summary = isBn ? parsedAdvice.summaryBn : parsedAdvice.summary;
                      const actions = isBn && parsedAdvice.immediateActionsBn ? parsedAdvice.immediateActionsBn : parsedAdvice.immediateActions;
                      const whyHappens = isBn && parsedAdvice.whyThisHappensBn ? parsedAdvice.whyThisHappensBn : parsedAdvice.whyThisHappens;
                      const prev = isBn && parsedAdvice.preventionBn ? parsedAdvice.preventionBn : parsedAdvice.prevention;
                      const escalate = isBn && parsedAdvice.whenToEscalateBn ? parsedAdvice.whenToEscalateBn : parsedAdvice.whenToEscalate;

                      return (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                              <Sparkles className="h-3.5 w-3.5" /> AI Advice
                            </h4>
                            {hasBn && (
                              <div className="flex rounded-md border border-border overflow-hidden text-xs">
                                <button
                                  type="button"
                                  onClick={() => setAdviceLang("en")}
                                  className={`px-2 py-0.5 font-medium transition-colors ${
                                    adviceLang === "en"
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-background text-muted-foreground hover:bg-muted"
                                  }`}
                                >
                                  EN
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAdviceLang("bn")}
                                  className={`px-2 py-0.5 font-medium transition-colors ${
                                    adviceLang === "bn"
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-background text-muted-foreground hover:bg-muted"
                                  }`}
                                >
                                  BN
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="space-y-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                            {summary && (
                              <p className="text-sm text-foreground/90 leading-relaxed">{summary}</p>
                            )}

                            {actions && actions.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-primary mt-1 mb-1">
                                  {isBn ? "তাৎক্ষণিক পদক্ষেপ" : "Immediate Actions"}
                                </p>
                                <ul className="space-y-0.5">
                                  {actions.map((a, i) => (
                                    <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/70">
                                      <span className="text-primary mt-0.5 shrink-0">•</span>
                                      <span>{a}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {whyHappens && whyHappens.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mt-1 mb-1">
                                  {isBn ? "কেন এটি হয়" : "Why This Happens"}
                                </p>
                                <ul className="space-y-0.5">
                                  {whyHappens.map((w, i) => (
                                    <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/70">
                                      <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                                      <span>{w}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {prev && prev.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mt-1 mb-1">
                                  {isBn ? "প্রতিরোধ" : "Prevention"}
                                </p>
                                <ul className="space-y-0.5">
                                  {prev.map((p, i) => (
                                    <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/70">
                                      <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                                      <span>{p}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {escalate && (
                              <div className="mt-1 rounded-md bg-amber-500/10 border border-amber-500/15 p-2">
                                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">
                                  {isBn ? "কখন সাহায্য নিতে হবে" : "When to Seek Help"}
                                </p>
                                <p className="text-xs text-foreground/70">{escalate}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Linked Chat */}
                    {issue.linkedChatId && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5" /> Linked Chat
                        </h4>
                        <Link
                          to={`/chats/${issue.linkedChatId}`}
                          className="flex items-center gap-2 p-2.5 rounded-md bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors text-sm font-medium"
                          onClick={() => onOpenChange(false)}
                        >
                          <MessageSquare className="h-4 w-4" />
                          {issue.linkedChatTitle || `Chat #${issue.linkedChatId}`}
                        </Link>
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Created: {formatDate(issue.createdAt)}
                      </span>
                      {issue.updatedAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Updated: {formatDate(issue.updatedAt)}
                        </span>
                      )}
                    </div>
                  </>
                )}

                {/* ═══ Officer Actions ═══ */}
                {(canAccept || canForward || canForwardToPool || canEdit) && !editing && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5" /> Officer Actions
                      </h4>

                      {canAccept && (
                        <Button
                          onClick={handleAccept}
                          disabled={actionLoading}
                          className="w-full"
                        >
                          {actionLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                          )}
                          Accept Issue
                        </Button>
                      )}

                      {canForward && !showForwardUI && (
                        <Button
                          variant="outline"
                          onClick={handleShowForward}
                          className="w-full"
                        >
                          <ArrowRightLeft className="h-4 w-4 mr-2" />
                          Forward to Another Officer
                        </Button>
                      )}

                      {showForwardUI && (
                        <div className="space-y-2 p-3 rounded-lg border bg-muted/20">
                          <label className="text-sm font-medium">Select Officer</label>
                          <Select value={targetOfficer} onValueChange={setTargetOfficer}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose an officer..." />
                            </SelectTrigger>
                            <SelectContent>
                              {officers
                                .filter((o) => o.username !== user?.username)
                                .map((o) => (
                                  <SelectItem key={o.username} value={o.username}>
                                    {o.username}
                                    {o.identificationNumber ? ` (${o.identificationNumber})` : ""}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleForward}
                              disabled={!targetOfficer || actionLoading}
                            >
                              {actionLoading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                              Confirm Forward
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowForwardUI(false);
                                setTargetOfficer("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {canForwardToPool && (
                        <Button
                          variant="outline"
                          onClick={handleForwardToPool}
                          disabled={actionLoading}
                          className="w-full"
                        >
                          {actionLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Inbox className="h-4 w-4 mr-2" />
                          )}
                          Forward to Pool
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
