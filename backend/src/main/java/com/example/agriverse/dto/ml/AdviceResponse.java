package com.example.agriverse.dto.ml;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class AdviceResponse {
    private String summary;
    private List<String> immediateActions;
    private List<String> prevention;
    private List<String> whyThisHappens;
    private String whenToEscalate;

    // Bangla translations (null if translation failed or not attempted)
    private String summaryBn;
    private List<String> immediateActionsBn;
    private List<String> preventionBn;
    private List<String> whyThisHappensBn;
    private String whenToEscalateBn;
}
