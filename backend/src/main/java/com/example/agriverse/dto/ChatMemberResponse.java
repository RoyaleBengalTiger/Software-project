package com.example.agriverse.dto;

import com.example.agriverse.model.ChatRole;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@Builder
public class ChatMemberResponse {
    private Long userId;
    private String username;
    private ChatRole roleInChat;
    private Instant joinedAt;
}
