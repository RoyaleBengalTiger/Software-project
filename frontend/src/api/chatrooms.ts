// src/api/chatrooms.ts
import apiClient from "@/api/client";

export type ChatRoomStatus = "ACTIVE" | "CLOSED";
export type ChatRole = "OFFICER" | "FARMER" | "ADMIN";
export type MessageType = "TEXT" | "SYSTEM";

export type ChatMember = {
  userId: number;
  username: string;
  roleInChat: ChatRole;
  joinedAt: string;
};

export type ChatIssueInfo = {
  issueId: number;
  farmerUsername: string;
  predictedDisease: string;
  issueStatus: string;
  latitude: number;
  longitude: number;
};

export type ChatRoom = {
  id: number;
  title: string;
  diseaseLabel?: string | null;
  createdByOfficerUsername: string;
  status: ChatRoomStatus;
  createdAt: string;
  updatedAt?: string | null;
  members?: ChatMember[];
  linkedIssues?: ChatIssueInfo[];
};

export type ChatMessage = {
  id: number;
  chatRoomId: number;
  senderUsername: string;
  senderRole?: string | null;
  content: string;
  type: MessageType;
  createdAt: string;
};

export const chatRoomsApi = {
  createFromIssues: async (data: {
    title: string;
    diseaseLabel?: string;
    issueIds: number[];
  }): Promise<ChatRoom> => {
    const res = await apiClient.post<ChatRoom>("/api/chats", data);
    return res.data;
  },

  addIssues: async (chatId: number, issueIds: number[]): Promise<ChatRoom> => {
    const res = await apiClient.post<ChatRoom>(`/api/chats/${chatId}/add-issues`, { issueIds });
    return res.data;
  },

  getById: async (id: number): Promise<ChatRoom> => {
    const res = await apiClient.get<ChatRoom>(`/api/chats/${id}`);
    return res.data;
  },

  list: async (page = 0, size = 20) => {
    const res = await apiClient.get("/api/chats", { params: { page, size } });
    return res.data;
  },

  mine: async (page = 0, size = 20) => {
    const res = await apiClient.get("/api/chats/mine", { params: { page, size } });
    return res.data;
  },

  active: async (page = 0, size = 20) => {
    const res = await apiClient.get("/api/chats/active", { params: { page, size } });
    return res.data;
  },

  byDisease: async (diseaseLabel: string): Promise<ChatRoom[]> => {
    const res = await apiClient.get<ChatRoom[]>("/api/chats/by-disease", {
      params: { diseaseLabel },
    });
    return res.data;
  },

  messages: async (chatId: number, page = 0, size = 50) => {
    const res = await apiClient.get(`/api/chats/${chatId}/messages`, {
      params: { page, size },
    });
    return res.data;
  },

  sendMessage: async (chatId: number, content: string): Promise<ChatMessage> => {
    const res = await apiClient.post<ChatMessage>(`/api/chats/${chatId}/messages`, { content });
    return res.data;
  },

  close: async (chatId: number): Promise<ChatRoom> => {
    const res = await apiClient.post<ChatRoom>(`/api/chats/${chatId}/close`);
    return res.data;
  },

  transfer: async (chatId: number, toOfficerUsername: string): Promise<ChatRoom> => {
    const res = await apiClient.post<ChatRoom>(`/api/chats/${chatId}/transfer`, { toOfficerUsername });
    return res.data;
  },
};
