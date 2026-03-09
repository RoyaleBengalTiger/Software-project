package com.example.agriverse.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class AddIssuesToChatRequest {
    @NotEmpty
    private List<Long> issueIds;
}
