package com.example.agriverse.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class CreateChatFromIssuesRequest {
    @NotBlank
    private String title;

    private String diseaseLabel;

    @NotEmpty
    private List<Long> issueIds;
}
