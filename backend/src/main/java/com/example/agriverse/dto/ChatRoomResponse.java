package com.example.agriverse.dto;

import com.example.agriverse.model.ChatRoomStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.List;

@Getter
@Builder
public class ChatRoomResponse {
    private Long id;
    private String title;
    private String diseaseLabel;
    private String createdByOfficerUsername;
    private ChatRoomStatus status;
    private Instant createdAt;
    private Instant updatedAt;
    private List<ChatMemberResponse> members;
    private List<ChatIssueInfo> linkedIssues;
}
