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
}
