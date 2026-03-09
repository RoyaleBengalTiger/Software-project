package com.example.agriverse.controller;

import com.example.agriverse.dto.CreateIssueRequest;
import com.example.agriverse.dto.ForwardIssueRequest;
import com.example.agriverse.model.IssueStatus;
import com.example.agriverse.service.IssueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/issues")
@RequiredArgsConstructor
public class IssueController {

    private final IssueService issueService;

    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    @PostMapping(consumes = { "multipart/form-data" })
    public ResponseEntity<?> create(
            @RequestPart("predictedDisease") String predictedDisease,
            @RequestPart(value = "cropName", required = false) String cropName,
            @RequestPart(value = "confidence", required = false) String confidence,
            @RequestPart(value = "note", required = false) String note,
            @RequestPart("latitude") String latitude,
            @RequestPart("longitude") String longitude,
            @RequestPart(value = "locationText", required = false) String locationText,
            @RequestPart(value = "image", required = false) List<MultipartFile> images) {

        CreateIssueRequest req = new CreateIssueRequest();
        req.setPredictedDisease(predictedDisease);
        req.setCropName(cropName);
        req.setConfidence(confidence != null ? Double.parseDouble(confidence) : null);
        req.setNote(note);
        req.setLatitude(Double.parseDouble(latitude));
        req.setLongitude(Double.parseDouble(longitude));
        req.setLocationText(locationText);

        return ResponseEntity.ok(issueService.createIssue(req, images));
    }

    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    @GetMapping("/mine")
    public ResponseEntity<?> myIssues(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(issueService.myIssues(page, size));
    }

    @PreAuthorize("hasAnyRole('GOVT_OFFICER','ADMIN')")
    @GetMapping("/queue")
    public ResponseEntity<?> issueQueue(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(issueService.issueQueue(page, size));
    }

    @PreAuthorize("hasAnyRole('GOVT_OFFICER','ADMIN')")
    @GetMapping("/all")
    public ResponseEntity<?> allIssues(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(issueService.allIssues(page, size));
    }

    @PreAuthorize("hasAnyRole('GOVT_OFFICER','ADMIN')")
    @GetMapping("/pool")
    public ResponseEntity<?> issuePool(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(issueService.issuePool(page, size));
    }

    @PreAuthorize("hasAnyRole('GOVT_OFFICER','ADMIN')")
    @GetMapping("/assigned")
    public ResponseEntity<?> myAssigned(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(issueService.myAssignedIssues(page, size));
    }

    @PreAuthorize("hasAnyRole('USER','GOVT_OFFICER','ADMIN')")
    @GetMapping("/map")
    public ResponseEntity<?> mapMarkers() {
        return ResponseEntity.ok(issueService.getIssueMapMarkers());
    }

    // ---- Path-variable routes MUST come after all literal paths ----

    @PreAuthorize("hasAnyRole('USER','GOVT_OFFICER','ADMIN')")
    @GetMapping("/{id:\\d+}")
    public ResponseEntity<?> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(issueService.getIssue(id));
    }

    @PreAuthorize("hasAnyRole('GOVT_OFFICER','ADMIN')")
    @PostMapping("/{id:\\d+}/assign")
    public ResponseEntity<?> assignToSelf(@PathVariable Long id) {
        return ResponseEntity.ok(issueService.assignToSelf(id));
    }

    @PreAuthorize("hasAnyRole('GOVT_OFFICER','ADMIN')")
    @PostMapping("/{id:\\d+}/review-disease")
    public ResponseEntity<?> reviewDisease(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String reviewedDisease = body.get("reviewedDisease");
        if (reviewedDisease == null || reviewedDisease.isBlank()) {
            throw new RuntimeException("reviewedDisease is required");
        }
        return ResponseEntity.ok(issueService.updateReviewedDisease(id, reviewedDisease.trim()));
    }

    @PreAuthorize("hasAnyRole('GOVT_OFFICER','ADMIN')")
    @PostMapping("/{id:\\d+}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String statusStr = body.get("status");
        if (statusStr == null || statusStr.isBlank()) {
            throw new RuntimeException("status is required");
        }
        IssueStatus status = IssueStatus.valueOf(statusStr.trim().toUpperCase());
        return ResponseEntity.ok(issueService.updateStatus(id, status));
    }

    @PreAuthorize("hasAnyRole('GOVT_OFFICER','ADMIN')")
    @PostMapping("/{id:\\d+}/forward")
    public ResponseEntity<?> forward(
            @PathVariable Long id,
            @RequestBody ForwardIssueRequest body) {
        return ResponseEntity.ok(issueService.forwardIssue(id, body.getToOfficerUsername()));
    }
}
