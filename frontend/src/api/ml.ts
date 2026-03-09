// src/api/ml.ts
import apiClient from "@/api/client";

export type MlTopK = { label: string; score: number };

export type MlPredictionResponse = {
  /** Present when the ML service returns an error (e.g. model unavailable). */
  error?: string;

  /** Whether the image contains a leaf. */
  is_leaf?: boolean;

  /** Reason shown when is_leaf === false (e.g. "Not a plant leaf"). */
  reason?: string;

  /** Probability that the image is a leaf (0–1). */
  leaf_probability?: number;

  /** Combined label e.g. "Rice___Blast". Split on "___" to get crop & disease. */
  prediction?: string;

  /** Confidence for the top prediction (0–1). */
  confidence?: number;

  /** Top-k predictions with labels and scores. */
  topk?: MlTopK[];

  crop?: string;
  model?: string;

  /** Per-image breakdown (simplified structure to avoid deep recursion issues if needed, but here we reuse the type) */
  allPredictions?: MlPredictionResponse[];
};

/** POST /api/ml/predict — multiple images supported */
export async function mlPredict(images: Blob[]) {
  const form = new FormData();
  images.forEach((img) => form.append("image", img, "leaf.jpg"));

  const res = await apiClient.post<MlPredictionResponse>("/api/ml/predict", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export type AdviceData = {
  summary: string;
  immediateActions: string[];
  prevention: string[];
  whyThisHappens: string[];
  whenToEscalate: string;
  // Bangla translations (null if translation failed)
  summaryBn?: string | null;
  immediateActionsBn?: string[] | null;
  preventionBn?: string[] | null;
  whyThisHappensBn?: string[] | null;
  whenToEscalateBn?: string | null;
};

export type MlAdviceResponse = {
  prediction: string;
  confidence: number;
  advice: AdviceData;
};

/** POST /api/ml/advice — returns structured advice from local Ollama */
export async function mlAdvice(
  cropName: string,
  diseaseName: string,
  confidence?: number
) {
  const res = await apiClient.post<MlAdviceResponse>("/api/ml/advice", {
    crop_name: cropName,
    disease_name: diseaseName,
    confidence: confidence != null ? String(confidence) : undefined,
  });
  return res.data;
}
