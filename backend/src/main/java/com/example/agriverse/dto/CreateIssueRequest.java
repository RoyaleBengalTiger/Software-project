package com.example.agriverse.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateIssueRequest {
    @NotBlank
    private String predictedDisease;

    private String cropName;
    private Double confidence;
    private String note;
    private String aiAdvice;

    @NotNull
    private Double latitude;

    @NotNull
    private Double longitude;

    private String locationText;
}
