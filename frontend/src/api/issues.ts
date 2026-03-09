// src/api/issues.ts
import apiClient from "@/api/client";

export type IssueStatus = "NEW" | "UNDER_REVIEW" | "GROUPED_IN_CHAT" | "RESOLVED" | "CLOSED";
export type DiagnosisSource = "ML" | "OFFICER_REVIEWED";

export type IssueUserInfo = {
  username: string;
  email: string;
  identificationNumber?: string | null;
  roles?: string[];
};

export type Issue = {
  id: number;
  predictionId?: number | null;
  farmerUsername: string;
  predictedDisease: string;
  reviewedDisease?: string | null;
  diagnosisSource: DiagnosisSource;
  status: IssueStatus;
  note?: string | null;
  latitude: number;
  longitude: number;
  locationText?: string | null;
  cropName?: string | null;
  confidence?: number | null;
  imageUrls?: string[];
  assignedOfficerUsername?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  linkedChatId?: number | null;
  linkedChatTitle?: string | null;
  farmer?: IssueUserInfo | null;
  assignedOfficer?: IssueUserInfo | null;
};

export type IssueMapMarker = {
  id: number;
  latitude: number;
  longitude: number;
  predictedDisease: string;
  reviewedDisease?: string | null;
  cropName?: string | null;
  status: string;
  farmerUsername: string;
  linkedChatId?: number | null;
  linkedChatTitle?: string | null;
  createdAt: string;
  imageUrls?: string[];
};

export const issuesApi = {
  create: async (data: {
    predictedDisease: string;
    cropName?: string;
    confidence?: number;
    note?: string;
    latitude: number;
    longitude: number;
    locationText?: string;
    images?: File[] | Blob[];
  }): Promise<Issue> => {
    const fd = new FormData();
    fd.append("predictedDisease", data.predictedDisease);
    if (data.cropName) fd.append("cropName", data.cropName);
    if (data.confidence != null) fd.append("confidence", String(data.confidence));
    if (data.note) fd.append("note", data.note);
    fd.append("latitude", String(data.latitude));
    fd.append("longitude", String(data.longitude));
    if (data.locationText) fd.append("locationText", data.locationText);
    if (data.images) {
      data.images.forEach((img) => fd.append("image", img, "leaf.jpg"));
    }
    const res = await apiClient.post<Issue>("/api/issues", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  createFromMl: async (data: {
    predictedDisease: string;
    cropName?: string;
    confidence?: number;
    note?: string;
    latitude: number;
    longitude: number;
    locationText?: string;
    forwardMode?: "pool" | "nearest";
    images?: File[] | Blob[];
  }): Promise<Issue> => {
    const fd = new FormData();
    fd.append("predictedDisease", data.predictedDisease);
    if (data.cropName) fd.append("cropName", data.cropName);
    if (data.confidence != null) fd.append("confidence", String(data.confidence));
    if (data.note) fd.append("note", data.note);
    fd.append("latitude", String(data.latitude));
    fd.append("longitude", String(data.longitude));
    if (data.locationText) fd.append("locationText", data.locationText);
    if (data.forwardMode) fd.append("forwardMode", data.forwardMode);
    if (data.images) {
      data.images.forEach((img) => fd.append("image", img, "leaf.jpg"));
    }
    const res = await apiClient.post<Issue>("/api/ml/create-issue", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  getById: async (id: number): Promise<Issue> => {
    const res = await apiClient.get<Issue>(`/api/issues/${id}`);
    return res.data;
  },

  myIssues: async (page = 0, size = 20) => {
    const res = await apiClient.get("/api/issues/mine", { params: { page, size } });
    return res.data;
  },

  queue: async (page = 0, size = 20) => {
    const res = await apiClient.get("/api/issues/queue", { params: { page, size } });
    return res.data;
  },

  all: async (page = 0, size = 20) => {
    const res = await apiClient.get("/api/issues/all", { params: { page, size } });
    return res.data;
  },

  assignToSelf: async (id: number): Promise<Issue> => {
    const res = await apiClient.post<Issue>(`/api/issues/${id}/assign`);
    return res.data;
  },

  reviewDisease: async (id: number, reviewedDisease: string): Promise<Issue> => {
    const res = await apiClient.post<Issue>(`/api/issues/${id}/review-disease`, { reviewedDisease });
    return res.data;
  },

  updateStatus: async (id: number, status: IssueStatus): Promise<Issue> => {
    const res = await apiClient.post<Issue>(`/api/issues/${id}/status`, { status });
    return res.data;
  },

  mapMarkers: async (): Promise<IssueMapMarker[]> => {
    const res = await apiClient.get<IssueMapMarker[]>("/api/issues/map");
    return res.data;
  },

  forward: async (id: number, toOfficerUsername: string): Promise<Issue> => {
    const res = await apiClient.post<Issue>(`/api/issues/${id}/forward`, { toOfficerUsername });
    return res.data;
  },

  pool: async (page = 0, size = 20) => {
    const res = await apiClient.get("/api/issues/pool", { params: { page, size } });
    return res.data;
  },

  assigned: async (page = 0, size = 20) => {
    const res = await apiClient.get("/api/issues/assigned", { params: { page, size } });
    return res.data;
  },

  listGovtOfficers: async (): Promise<{ username: string; identificationNumber?: string | null }[]> => {
    const res = await apiClient.get("/api/users/govt-officers");
    return res.data;
  },
};
