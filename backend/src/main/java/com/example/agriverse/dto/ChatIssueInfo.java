package com.example.agriverse.dto;

import com.example.agriverse.model.IssueStatus;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ChatIssueInfo {
    private Long issueId;
    private String farmerUsername;
    private String predictedDisease;
    private IssueStatus issueStatus;
    private Double latitude;
    private Double longitude;
}
