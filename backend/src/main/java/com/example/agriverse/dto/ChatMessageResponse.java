package com.example.agriverse.dto;

import com.example.agriverse.model.MessageType;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@Builder
public class ChatMessageResponse {
    private Long id;
    private Long chatRoomId;
    private String senderUsername;
    private String senderRole;
    private String senderType;
    private String targetType;
    private String content;
    private MessageType type;
    private Instant createdAt;
}
