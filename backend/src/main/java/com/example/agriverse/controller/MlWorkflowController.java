package com.example.agriverse.controller;

import com.example.agriverse.dto.CreateIssueRequest;
import com.example.agriverse.dto.IssueResponse;
import com.example.agriverse.dto.ml.MlPredictionResponse;
import com.example.agriverse.service.MlPredictionService;
import com.example.agriverse.service.IssueService;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

import com.example.agriverse.dto.ml.PredictAndCreateResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.example.agriverse.service.AiAdviceService;

@RestController
@RequestMapping("/api/ml")
@RequiredArgsConstructor
public class MlWorkflowController {
    private final MlPredictionService mlPredictionService;
    private final AiAdviceService aiAdviceService;
    private final IssueService issueService;

    /**
     * POST /api/ml/predict
     * Sends image(s) to Python ML service and returns prediction results.
     */
    @PostMapping(value = "/predict", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PredictAndCreateResponse predict(
            @RequestPart("image") List<MultipartFile> images) {
        List<MlPredictionResponse> allPredictions = mlPredictionService.predictAll(images);

        MlPredictionResponse best = allPredictions.stream()
                .filter(p -> p.error == null && p.is_leaf != null && p.is_leaf)
                .max(Comparator.comparingDouble(p -> p.confidence != null ? p.confidence : -1.0))
                .orElse(null);

        if (best == null) {
            best = allPredictions.stream()
                    .filter(p -> p.error == null)
                    .findFirst()
                    .orElse(allPredictions.isEmpty() ? null : allPredictions.get(0));
        }

        return PredictAndCreateResponse.builder()
                .prediction(best)
                .allPredictions(allPredictions)
                .advice(null)
                .build();
    }

    @PostMapping("/advice")
    public Map<String, Object> advice(@RequestBody Map<String, String> body) {
        String cropName = body.get("crop_name");
        String diseaseName = body.get("disease_name");

        String answer = aiAdviceService.getAdvice(cropName, diseaseName);
        return Map.of("answer", answer);
    }

    /**
     * POST /api/ml/create-issue
     * Creates an Issue from a disease detection result.
     * Replaces the old /api/ml/forward endpoint for the new Issue-first workflow.
     */
    @PostMapping(value = "/create-issue", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public IssueResponse createIssueFromPrediction(
            @RequestPart("predictedDisease") String predictedDisease,
            @RequestPart(value = "cropName", required = false) String cropName,
            @RequestPart(value = "confidence", required = false) String confidence,
            @RequestPart(value = "note", required = false) String note,
            @RequestPart("latitude") String latitude,
            @RequestPart("longitude") String longitude,
            @RequestPart(value = "locationText", required = false) String locationText,
            @RequestPart(value = "forwardMode", required = false) String forwardMode,
            @RequestPart(value = "image", required = false) List<MultipartFile> images) {

        CreateIssueRequest req = new CreateIssueRequest();
        req.setPredictedDisease(predictedDisease);
        req.setCropName(cropName);
        req.setConfidence(confidence != null ? Double.parseDouble(confidence) : null);
        req.setNote(note);
        req.setLatitude(Double.parseDouble(latitude));
        req.setLongitude(Double.parseDouble(longitude));
        req.setLocationText(locationText);

        if ("nearest".equalsIgnoreCase(forwardMode)) {
            return issueService.createIssueForNearestOfficer(req, images);
        }
        return issueService.createIssue(req, images);
    }
}
