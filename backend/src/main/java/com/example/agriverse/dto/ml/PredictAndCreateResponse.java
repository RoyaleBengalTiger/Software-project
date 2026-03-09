package com.example.agriverse.dto.ml;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class PredictAndCreateResponse {
    private MlPredictionResponse prediction; // best prediction (highest confidence, is_leaf=true)
    private List<MlPredictionResponse> allPredictions; // per-image results
    private String advice; // AI advice text
}
