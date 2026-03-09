import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  mlAdvice,
  mlPredict,
  MlPredictionResponse,
  AdviceData,
} from "@/api/ml";

import { issuesApi } from "@/api/issues";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Upload,
  Camera,
  Image as ImageIcon,
  Sparkles,
  MessageSquare,
  Send,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  BarChart3,
  Leaf,
  XCircle,
  X,
  Trash2,
  Crop,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";

// ─── Cropper ───
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";

// ─── Steps ───
const STEPS = [
  { key: "upload", label: "Upload Images", icon: Upload },
  { key: "predict", label: "Predict", icon: Sparkles },
  { key: "advice", label: "Advice", icon: MessageSquare },
  { key: "forward", label: "Request Help", icon: Send },
] as const;

type Step = (typeof STEPS)[number]["key"];

function getStepIndex(step: Step) {
  return STEPS.findIndex((s) => s.key === step);
}

function pct(x?: number) {
  if (x == null || Number.isNaN(x)) return "—";
  return `${(x * 100).toFixed(1)}%`;
}

function pctNum(x?: number) {
  if (x == null || Number.isNaN(x)) return 0;
  return Math.round(x * 100);
}

/** Split "Rice___Blast" → { crop: "Rice", disease: "Blast" } */
function parsePrediction(pred: any): { crop: string; disease: string } {
  if (typeof pred !== "string") return { crop: "—", disease: "—" };
  const parts = pred.split("___");
  if (parts.length >= 2) return { crop: parts[0], disease: parts.slice(1).join(" ") };
  return { crop: pred, disease: "—" };
}


/**
 * Compress an image File/Blob client-side.
 * Resizes to fit within maxDim and outputs JPEG at given quality.
 * This prevents HTTP 413 (Payload Too Large) from raw camera photos.
 */
function compressImage(
  file: File | Blob,
  maxDim = 1200,
  quality = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Only downscale, never upscale
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file as File); return; }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file as File); return; }
          const name = (file as File).name || "image.jpg";
          const compressed = new File([blob], name.replace(/\.[^.]+$/, ".jpg"), {
            type: "image/jpeg",
          });
          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = url;
  });
}

/**
 * Normalize ML predict response so the rest of the UI can be consistent.
 * Supports both "flat" and "nested" shapes.
 */
function normalizePredictResponse(res: any): {
  prediction: MlPredictionResponse | null;
  isLeaf: boolean | null;
  reason?: string;
  error?: string;
} {
  const error = res?.prediction?.error || res?.error;
  const isLeaf = res?.prediction?.is_leaf ?? res?.is_leaf ?? null;
  const reason = res?.prediction?.reason || res?.reason;

  if (error) return { prediction: null, isLeaf, reason, error: String(error) };

  const predObj =
    res?.prediction && typeof res.prediction === "object" ? res.prediction : res;

  return { prediction: predObj ?? null, isLeaf, reason };
}

// ═══════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════
export default function DiseaseDetectionPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // ─── State ───
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const [prediction, setPrediction] = useState<MlPredictionResponse | null>(null);
  const [isLeafDetected, setIsLeafDetected] = useState<boolean | null>(null);
  const [notLeaf, setNotLeaf] = useState<string | null>(null);

  const [advice, setAdvice] = useState<AdviceData | null>(null);
  const [adviceOpen, setAdviceOpen] = useState(false);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [adviceReady, setAdviceReady] = useState(false);
  const [adviceLang, setAdviceLang] = useState<"en" | "bn">("en");

  const [busyPredict, setBusyPredict] = useState(false);
  const [busyForward, setBusyForward] = useState(false);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [issueNote, setIssueNote] = useState("");
  const [forwardMode, setForwardMode] = useState<"pool" | "nearest">("pool");

  // ─── Crop Dialog State ───
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const cropperRef = useRef<any>(null);

  // ─── Derived ───
  const parsed = useMemo(() => parsePrediction(prediction?.prediction), [prediction]);
  const top5 = prediction?.topk?.slice(0, 5) ?? [];
  const allPredictions = prediction?.allPredictions ?? [];

  // ─── Cleanup: revoke object URLs on unmount ───
  useEffect(() => {
    return () => {
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previewUrls]);

  // ─── Current step ───
  const currentStep: Step = useMemo(() => {
    if (prediction && adviceReady) return "forward";
    if (prediction) return "advice";
    if (files.length > 0) return "predict";
    return "upload";
  }, [files, prediction, adviceReady]);

  // ─── Helpers ───
  const resetAll = useCallback(() => {
    setPrediction(null);
    setIsLeafDetected(null);
    setNotLeaf(null);

    setAdvice(null);
    setAdviceOpen(false);
    setAdviceReady(false);
    setAdviceLoading(false);
    setAdviceLang("en");

    setLocationError(false);

    // Close create issue UI if user changes files / resets
    setForwardDialogOpen(false);
    setIssueNote("");
  }, []);

  const revokeAllPreviews = useCallback((urls: string[]) => {
    urls.forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch { }
    });
  }, []);

  const clearAllFiles = useCallback(() => {
    revokeAllPreviews(previewUrls);
    setFiles([]);
    setPreviewUrls([]);
    resetAll();
  }, [previewUrls, resetAll, revokeAllPreviews]);

  const onAddFiles = useCallback(
    async (newFiles: FileList | null) => {
      if (!newFiles || newFiles.length === 0) return;
      const raw = Array.from(newFiles);

      // Compress all images to prevent 413 (Payload Too Large)
      const compressed = await Promise.all(raw.map((f) => compressImage(f)));

      setFiles((prev) => [...prev, ...compressed]);
      setPreviewUrls((prev) => [...prev, ...compressed.map((f) => URL.createObjectURL(f))]);

      // If user adds new images, previous results are no longer valid
      resetAll();
    },
    [resetAll]
  );

  const removeFile = useCallback(
    (index: number) => {
      setFiles((prev) => prev.filter((_, i) => i !== index));
      setPreviewUrls((prev) => {
        const urlToRemove = prev[index];
        if (urlToRemove) {
          try {
            URL.revokeObjectURL(urlToRemove);
          } catch { }
        }
        return prev.filter((_, i) => i !== index);
      });
      resetAll();
    },
    [resetAll]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files) onAddFiles(e.dataTransfer.files);
    },
    [onAddFiles]
  );

  // ✅ NEW: Open camera explicitly
  const openCamera = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  // ─── Crop handler ───
  const applyCrop = useCallback(() => {
    if (cropIndex === null) return;
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    const canvas = cropper.getCroppedCanvas();
    if (!canvas) return;

    // Output as compressed JPEG to keep file size small
    canvas.toBlob(
      async (blob: Blob | null) => {
        if (!blob) return;

        const originalFile = files[cropIndex];
        const name = originalFile?.name || `cropped_${cropIndex}.jpg`;

        // Compress the cropped result
        const croppedFile = await compressImage(
          new File([blob], name, { type: "image/jpeg" })
        );

        // Replace file
        setFiles((prev) => prev.map((f, i) => (i === cropIndex ? croppedFile : f)));

        // Replace preview URL
        setPreviewUrls((prev) => {
          const oldUrl = prev[cropIndex!];
          if (oldUrl) {
            try { URL.revokeObjectURL(oldUrl); } catch { }
          }
          const newUrl = URL.createObjectURL(croppedFile);
          return prev.map((u, i) => (i === cropIndex ? newUrl : u));
        });

        // Invalidate old prediction since image changed
        resetAll();
        setCropIndex(null);
      },
      "image/jpeg",
      0.85
    );
  }, [cropIndex, files, resetAll]);

  const doPredict = useCallback(async () => {
    if (files.length === 0) return;

    setBusyPredict(true);
    resetAll();

    try {
      const res: any = await mlPredict(files);
      const norm = normalizePredictResponse(res);

      if (norm.error) throw new Error(norm.error);

      // Not a leaf
      if (norm.isLeaf === false) {
        setIsLeafDetected(false);
        const msg = norm.reason || "The uploaded image is not a plant leaf.";
        setNotLeaf(msg);
        toast({ title: "Not a Leaf", description: msg, variant: "destructive" });
        return;
      }

      // Leaf (or unknown but prediction returned)
      setIsLeafDetected(norm.isLeaf ?? true);
      if (!norm.prediction) throw new Error("Invalid prediction response");

      setPrediction(norm.prediction);
      setAdviceOpen(true);

      const { crop, disease } = parsePrediction(norm.prediction?.prediction);
      toast({ title: "Prediction Complete ✅", description: `${crop} — ${disease}` });
    } catch (e: any) {
      toast({
        title: "Prediction Failed",
        description: e?.message || "Prediction failed",
        variant: "destructive",
      });
    } finally {
      setBusyPredict(false);
    }
  }, [files, resetAll, toast]);

  const doAdvice = useCallback(async () => {
    if (!prediction?.prediction || !parsed.crop || !parsed.disease) return;

    setAdviceOpen(true);
    setAdviceLoading(true);
    setAdvice(null);

    try {
      const res = await mlAdvice(parsed.crop, parsed.disease, prediction.confidence);
      setAdvice(res.advice ?? null);
      setAdviceReady(true);
      toast({ title: "AI Advice Ready" });
    } catch {
      setAdvice(null);
      toast({ title: "Advice Failed", description: "Could not generate advice. Ollama may be offline.", variant: "destructive" });
    } finally {
      setAdviceLoading(false);
    }
  }, [prediction, parsed.crop, parsed.disease, toast]);

  const permissionToForward = useMemo(() => {
    return (
      files.length > 0 &&
      isLeafDetected !== false
    );
  }, [files.length, isLeafDetected]);

  const openForwardDialog = useCallback(() => {
    if (!permissionToForward) return;
    setLocationError(false);
    setForwardDialogOpen(true);
  }, [permissionToForward]);

  const doCreateIssue = useCallback(
    async () => {
      if (!permissionToForward) return;

      setBusyForward(true);
      setLocationError(false);

      try {
        // Get user location
        let lat = 0;
        let lng = 0;
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000,
            });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          setLocationError(true);
          setBusyForward(false);
          return;
        }

        const diseaseStr = parsed.disease !== "—" ? parsed.disease : "Unknown";
        const cropStr = parsed.crop !== "—" ? parsed.crop : undefined;
        const noteText = issueNote.trim() || (
          prediction
            ? `${parsed.crop} - ${diseaseStr}`
            : 'Disease detection - awaiting analysis'
        );

        // Serialize full advice as JSON if available
        const aiAdviceJson = adviceReady && advice ? JSON.stringify(advice) : undefined;

        const res = await issuesApi.createFromMl({
          predictedDisease: diseaseStr,
          cropName: cropStr,
          confidence: prediction?.confidence ?? undefined,
          note: noteText,
          aiAdvice: aiAdviceJson,
          latitude: lat,
          longitude: lng,
          forwardMode,
          images: files,
        });

        toast({
          title: "Issue Created",
          description: forwardMode === "nearest"
            ? "Your issue has been assigned to the nearest officer."
            : "Your issue has been submitted to the officer pool.",
        });

        setForwardDialogOpen(false);
        if (res?.id) navigate(`/issues/${res.id}`);
      } catch (error) {
        const axiosErr = error as AxiosError<any>;
        const data = axiosErr.response?.data;
        const msg =
          typeof data === "string" ? data : data?.message || data?.error || "Failed to create issue";
        toast({ title: "Failed", description: msg, variant: "destructive" });
      } finally {
        setBusyForward(false);
      }
    },
    [permissionToForward, parsed.crop, parsed.disease, advice, adviceReady, files, toast, navigate, prediction, issueNote, forwardMode]
  );

  // ─── Render ───
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        {/* ═══ Header ═══ */}
        <BackButton className="-ml-1" />
        <header className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Leaf className="h-4 w-4" />
            AI-Powered Detection
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Plant Disease Detection
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Upload leaf images (one or many) and our AI will detect the crop, identify disease, and
            help you forward it to an officer.
          </p>
        </header>

        {/* ═══ Step Progress ═══ */}
        <div className="flex items-center justify-center gap-1 sm:gap-0">
          {STEPS.map((step, i) => {
            const idx = getStepIndex(currentStep);
            const done = i < idx;
            const active = i === idx;
            const StepIcon = step.icon;
            return (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${done
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : active
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110"
                        : "bg-muted text-muted-foreground"
                      }`}
                  >
                    {done ? <CheckCircle2 className="h-5 w-5" /> : <StepIcon className="h-4 w-4" />}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:block ${active ? "text-primary" : "text-muted-foreground"
                      }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-8 sm:w-16 h-0.5 mx-1 sm:mx-2 mb-5 transition-colors duration-300 ${i < idx ? "bg-primary" : "bg-border"
                      }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ═══ Main Content ═══ */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* ─── Left: Upload Panel ─── */}
          <div className="lg:col-span-3 space-y-5">
            <Card className="border-border/50 overflow-hidden">
              <CardContent className="p-0">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center py-12 px-6 text-center transition-all duration-300 cursor-pointer
                    ${isDragging ? "bg-primary/10 border-primary" : "bg-muted/30 hover:bg-muted/50"}
                  `}
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <div
                    className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-3 transition-all duration-300 ${isDragging ? "bg-primary/20 scale-110" : "bg-primary/10"
                      }`}
                  >
                    <Upload
                      className={`h-6 w-6 transition-colors ${isDragging ? "text-primary" : "text-primary/70"
                        }`}
                    />
                  </div>
                  <p className="font-semibold text-base mb-1">Click to upload or drag images here</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Support multiple files (JPG, PNG)
                  </p>

                  {/* ✅ NEW: Two buttons: Camera + Select Files */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={(e) => {
                        e.stopPropagation(); // prevent opening gallery
                        openCamera();
                      }}
                    >
                      <Camera className="h-4 w-4" />
                      Camera
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={(e) => {
                        e.stopPropagation(); // prevent parent click double-trigger
                        galleryInputRef.current?.click();
                      }}
                    >
                      <ImageIcon className="h-4 w-4" />
                      Select Files
                    </Button>
                  </div>
                </div>

                {/* Hidden Inputs */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => onAddFiles(e.target.files)}
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => onAddFiles(e.target.files)}
                />
              </CardContent>

              {/* Thumbnails */}
              {files.length > 0 && (
                <div className="p-4 bg-background border-t border-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">{files.length} images selected</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-destructive text-xs hover:bg-transparent hover:text-destructive/80"
                      onClick={clearAllFiles}
                    >
                      Clear all
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {previewUrls.map((url, i) => (
                      <div
                        key={i}
                        className="relative aspect-square rounded-lg overflow-hidden border border-border/50 group"
                      >
                        <img
                          src={url}
                          alt="Preview"
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setCropIndex(i)}
                          title="Click to crop"
                        />
                        <div className="absolute bottom-1 left-1 h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <Crop className="h-3 w-3" />
                        </div>
                        <button
                          onClick={() => removeFile(i)}
                          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                          type="button"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Add more button */}
                    <button
                      onClick={() => galleryInputRef.current?.click()}
                      className="aspect-square rounded-lg border border-dashed border-border/70 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors"
                      type="button"
                    >
                      <Upload className="h-5 w-5 mb-1 opacity-50" />
                      <span className="text-[10px]">Add more</span>
                    </button>
                  </div>
                </div>
              )}
            </Card>

            {/* Predict Button */}
            {files.length > 0 && !prediction && !notLeaf && (
              <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2">
                <Button
                  size="lg"
                  className="w-full sm:w-auto gap-2"
                  onClick={doPredict}
                  disabled={busyPredict}
                >
                  {busyPredict ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {busyPredict ? "Analyzing Images..." : "Run Prediction"}
                </Button>
              </div>
            )}

            {/* ═══ Not-a-Leaf Banner ═══ */}
            {notLeaf && (
              <Card className="border-destructive/30 bg-destructive/5 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                      <XCircle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-destructive">Prediction Failed</h3>
                      <p className="text-sm text-muted-foreground mt-1">{notLeaf}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 gap-2"
                        onClick={clearAllFiles}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Clear & Try Again
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ─── Right: Results Panel ─── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Prediction results */}
            {prediction ? (
              <Card className="border-border/50 overflow-hidden animate-in slide-in-from-right-4 duration-500">
                <div className="p-5 bg-gradient-to-br from-primary/5 to-transparent border-b border-border/50">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Analysis Result
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`h-12 w-12 rounded-xl flex items-center justify-center text-lg ${parsed.disease.toLowerCase().includes("healthy")
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-amber-500/10 text-amber-600"
                        }`}
                    >
                      {parsed.disease.toLowerCase().includes("healthy") ? "✅" : "⚠️"}
                    </div>
                    <div>
                      <p className="font-bold text-lg leading-tight">{parsed.disease}</p>
                      <p className="text-sm text-muted-foreground">
                        Best Confidence: {pct(prediction.confidence)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-sm">
                    <Leaf className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">Crop:</span>
                    <span className="font-semibold">{parsed.crop}</span>
                  </div>
                </div>

                {/* Per-Image Breakdown */}
                {allPredictions.length > 0 && (
                  <div className="p-4 bg-muted/5 border-b border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Image Breakdown
                    </p>
                    <div className="space-y-2">
                      {allPredictions.map((sub: any, i: number) => {
                        if (!sub.is_leaf) {
                          return (
                            <div
                              key={i}
                              className="text-xs flex items-center justify-between text-destructive"
                            >
                              <span>Image {i + 1}: Not a leaf</span>
                              <AlertTriangle className="h-3 w-3" />
                            </div>
                          );
                        }
                        const p = parsePrediction(sub.prediction);
                        return (
                          <div key={i} className="text-xs flex items-center justify-between">
                            <span>
                              Image {i + 1}: {p.crop} — {p.disease}
                            </span>
                            <span className="font-mono text-muted-foreground">
                              {pct(sub.confidence)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Top 5 Global */}
                {top5.length > 0 && (
                  <div className="p-5 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Top Global Predictions
                    </p>
                    {top5.map((t: any, i: number) => {
                      const { crop: c, disease: d } = parsePrediction(t.label);
                      return (
                        <div key={t.label} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className={i === 0 ? "font-semibold" : "text-muted-foreground"}>
                              {c} — {d}
                            </span>
                            <span
                              className={`font-mono text-xs ${i === 0 ? "font-bold text-primary" : "text-muted-foreground"
                                }`}
                            >
                              {pct(t.score)}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ease-out ${i === 0 ? "bg-primary" : "bg-primary/40"
                                }`}
                              style={{ width: `${pctNum(t.score)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            ) : notLeaf ? null : (
              <Card className="border-border/50 border-dashed">
                <CardContent className="p-8 flex flex-col items-center justify-center text-center text-muted-foreground">
                  <Sparkles className="h-10 w-10 mb-3 opacity-30" />
                  <p className="font-medium">No results yet</p>
                  <p className="text-sm mt-1">Upload images and run prediction to see analysis.</p>
                </CardContent>
              </Card>
            )}

            {/* AI Advice */}
            {prediction && (
              <Card className="border-border/50 overflow-hidden animate-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">AI Expert Advice</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* EN/BN toggle — only show when advice is ready and Bangla exists */}
                    {adviceReady && advice?.summaryBn && (
                      <div className="flex rounded-md border border-border overflow-hidden text-xs">
                        <button
                          type="button"
                          onClick={() => setAdviceLang("en")}
                          className={`px-2 py-1 font-medium transition-colors ${
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
                          className={`px-2 py-1 font-medium transition-colors ${
                            adviceLang === "bn"
                              ? "bg-primary text-primary-foreground"
                              : "bg-background text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          BN
                        </button>
                      </div>
                    )}

                    {!adviceReady && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={doAdvice}
                        disabled={adviceLoading}
                      >
                        {adviceLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        {adviceLoading ? "Generating…" : "Get Advice"}
                      </Button>
                    )}

                    {adviceReady && (
                      <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                      </span>
                    )}
                  </div>
                </div>

                <CardContent className="p-4">
                  {adviceLoading && (
                    <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating advice from local AI model...
                    </div>
                  )}

                  {adviceOpen && advice && !adviceLoading ? (() => {
                    const isBn = adviceLang === "bn" && !!advice.summaryBn;
                    const summary = isBn ? advice.summaryBn! : advice.summary;
                    const actions = isBn && advice.immediateActionsBn ? advice.immediateActionsBn : advice.immediateActions;
                    const whyHappens = isBn && advice.whyThisHappensBn ? advice.whyThisHappensBn : advice.whyThisHappens;
                    const prev = isBn && advice.preventionBn ? advice.preventionBn : advice.prevention;
                    const escalate = isBn && advice.whenToEscalateBn ? advice.whenToEscalateBn : advice.whenToEscalate;

                    return (
                      <div className="space-y-4 max-h-[28rem] overflow-y-auto text-sm">
                        {/* Summary */}
                        <div>
                          <p className="text-foreground/90 leading-relaxed">{summary}</p>
                        </div>

                        {/* Immediate Actions */}
                        {actions?.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-xs uppercase tracking-wider text-primary mb-1.5">
                              {isBn ? "তাৎক্ষণিক পদক্ষেপ" : "Immediate Actions"}
                            </h4>
                            <ul className="space-y-1">
                              {actions.map((a, i) => (
                                <li key={i} className="flex items-start gap-2 text-foreground/80">
                                  <span className="text-primary mt-0.5 shrink-0">•</span>
                                  <span>{a}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Why This Happens */}
                        {whyHappens?.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-xs uppercase tracking-wider text-amber-600 mb-1.5">
                              {isBn ? "কেন এটি হয়" : "Why This Happens"}
                            </h4>
                            <ul className="space-y-1">
                              {whyHappens.map((w, i) => (
                                <li key={i} className="flex items-start gap-2 text-foreground/80">
                                  <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                                  <span>{w}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Prevention */}
                        {prev?.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-xs uppercase tracking-wider text-emerald-600 mb-1.5">
                              {isBn ? "প্রতিরোধ" : "Prevention"}
                            </h4>
                            <ul className="space-y-1">
                              {prev.map((p, i) => (
                                <li key={i} className="flex items-start gap-2 text-foreground/80">
                                  <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                                  <span>{p}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* When to Escalate */}
                        {escalate && (
                          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                            <h4 className="font-semibold text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                              {isBn ? "কখন সাহায্য নিতে হবে" : "When to Seek Help"}
                            </h4>
                            <p className="text-foreground/80 text-sm">{escalate}</p>
                          </div>
                        )}
                      </div>
                    );
                  })() : !adviceLoading && !advice ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Click "Get Advice" for AI-powered treatment recommendations
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {/* Create Issue Action */}
            {permissionToForward && (
              <Card className="border-primary/30 bg-primary/5 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Ready to Request Help</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Create a support issue for government agricultural officers to review and assist you.
                  </p>
                  <Button className="w-full gap-2 h-11" onClick={openForwardDialog}>
                    <Send className="h-4 w-4" />
                    Request Govt Help
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Crop Dialog ═══ */}
      <Dialog
        open={cropIndex !== null}
        onOpenChange={(open) => {
          if (!open) setCropIndex(null);
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crop className="h-5 w-5 text-primary" />
              Crop Image
            </DialogTitle>
            <DialogDescription>
              Adjust the crop area and click Apply to replace the original.
            </DialogDescription>
          </DialogHeader>

          {cropIndex !== null && previewUrls[cropIndex] && (
            <div className="w-full max-h-[60vh] overflow-hidden rounded-lg border border-border/50">
              <Cropper
                ref={cropperRef}
                src={previewUrls[cropIndex]}
                style={{ height: "100%", width: "100%", maxHeight: "55vh" }}
                viewMode={1}
                guides
                movable
                zoomable
                scalable
                background={false}
                responsive
                autoCropArea={0.9}
                checkOrientation={false}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCropIndex(null)}>
              Cancel
            </Button>
            <Button className="gap-2" onClick={applyCrop}>
              <CheckCircle2 className="h-4 w-4" />
              Apply Crop
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Create Issue Dialog ═══ */}
      <Dialog
        open={forwardDialogOpen}
        onOpenChange={(open) => {
          if (!busyForward) setForwardDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Government Help</DialogTitle>
            <DialogDescription>Create a support issue from your disease detection for an officer to review.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {prediction ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{parsed.crop} — {parsed.disease}</p>
                  <p className="text-xs text-muted-foreground">
                    Confidence: {pct(prediction?.confidence)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  No prediction run yet — the officer will review your images directly.
                </p>
              </div>
            )}

            {/* AI Advice Summary */}
            {adviceReady && advice && (
              <div className="space-y-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                  <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">AI Advice Included</h4>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{advice.summary}</p>

                {advice.immediateActions?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary mt-2 mb-1">Immediate Actions</p>
                    <ul className="space-y-0.5">
                      {advice.immediateActions.map((a, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/70">
                          <span className="text-primary mt-0.5 shrink-0">•</span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {advice.prevention?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mt-2 mb-1">Prevention</p>
                    <ul className="space-y-0.5">
                      {advice.prevention.map((p, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/70">
                          <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {advice.whenToEscalate && (
                  <div className="mt-2 rounded-md bg-amber-500/10 border border-amber-500/15 p-2">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">When to Seek Help</p>
                    <p className="text-xs text-foreground/70">{advice.whenToEscalate}</p>
                  </div>
                )}
              </div>
            )}

            {/* Forward Mode Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Forward To</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForwardMode("pool")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    forwardMode === "pool"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="text-sm font-medium">Forward to Pool</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Any available officer can pick up
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setForwardMode("nearest")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    forwardMode === "nearest"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="text-sm font-medium">Nearest Officer</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Auto-assign to closest officer
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Note (optional)</label>
              <textarea
                className="w-full min-h-[80px] rounded-lg border border-border p-3 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Add any additional details about the issue..."
                value={issueNote}
                onChange={(e) => setIssueNote(e.target.value)}
              />
            </div>

            {locationError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 text-sm text-destructive space-y-2">
                <p className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Location required
                </p>
                <p>Please allow location access to create an issue. Your location will be attached to help nearby officers assist you.</p>
              </div>
            )}

            <Button
              className="w-full h-12 gap-3"
              onClick={doCreateIssue}
              disabled={busyForward}
            >
              {busyForward ? (
                <Loader2 className="h-5 w-5 animate-spin shrink-0" />
              ) : (
                <Send className="h-5 w-5 shrink-0" />
              )}
              <div>
                <div className="font-semibold">{busyForward ? "Creating Issue..." : "Create Support Issue"}</div>
                <div className="text-xs font-normal opacity-80">
                  {forwardMode === "nearest"
                    ? "Will be assigned to the nearest officer"
                    : "Officers will review and may group it into a chat"}
                </div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
