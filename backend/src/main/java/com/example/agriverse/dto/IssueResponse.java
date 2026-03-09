package com.example.agriverse.dto;

import com.example.agriverse.model.DiagnosisSource;
import com.example.agriverse.model.IssueStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.List;

@Getter
@Builder
public class IssueResponse {
    private Long id;
    private Long predictionId;
    private String farmerUsername;
    private String predictedDisease;
    private String reviewedDisease;
    private DiagnosisSource diagnosisSource;
    private IssueStatus status;
    private String note;
    private Double latitude;
    private Double longitude;
    private String locationText;
    private String cropName;
    private Double confidence;
    private List<String> imageUrls;
    private String assignedOfficerUsername;
    private Instant createdAt;
    private Instant updatedAt;
    private Long linkedChatId;
    private String linkedChatTitle;
    private UserInfo farmer;
    private UserInfo assignedOfficer;
}
