package com.example.agriverse.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SendChatMessageRequest {
    @NotBlank
    private String content;

    private boolean targetOllama;
}
