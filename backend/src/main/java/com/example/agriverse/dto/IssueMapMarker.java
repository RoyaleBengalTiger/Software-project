package com.example.agriverse.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.List;

@Getter
@Builder
public class IssueMapMarker {
    private Long id;
    private Double latitude;
    private Double longitude;
    private String predictedDisease;
    private String reviewedDisease;
    private String cropName;
    private String status;
    private String farmerUsername;
    private Long linkedChatId;
    private String linkedChatTitle;
    private Instant createdAt;
    private List<String> imageUrls;
}
