package com.example.agriverse.service;

import com.example.agriverse.dto.CreateIssueRequest;
import com.example.agriverse.dto.IssueMapMarker;
import com.example.agriverse.dto.IssueResponse;
import com.example.agriverse.dto.UserInfo;
import com.example.agriverse.model.*;
import com.example.agriverse.repository.ChatIssueLinkRepository;
import com.example.agriverse.repository.IssueRepository;
import com.example.agriverse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class IssueService {

    private final IssueRepository issueRepo;
    private final UserRepository userRepo;
    private final FileStorageService fileStorageService;
    private final ChatIssueLinkRepository chatIssueLinkRepo;

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null)
            throw new RuntimeException("Unauthorized");
        return userRepo.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private boolean hasRole(User user, String roleName) {
        return user.getRoles() != null && user.getRoles().stream().anyMatch(r -> roleName.equals(r.getName()));
    }

    private UserInfo toUserInfo(User u) {
        if (u == null) return null;
        return new UserInfo(
                u.getUsername(),
                u.getEmail(),
                u.getIdentificationNumber(),
                u.getRoles().stream().map(Role::getName).collect(Collectors.toSet()));
    }

    public IssueResponse createIssue(
            CreateIssueRequest req,
            List<MultipartFile> images) {
        User farmer = currentUser();

        List<String> imageUrls = fileStorageService.saveImages(images);

        Issue issue = Issue.builder()
                .farmer(farmer)
                .predictedDisease(req.getPredictedDisease())
                .cropName(req.getCropName())
                .confidence(req.getConfidence())
                .diagnosisSource(DiagnosisSource.ML)
                .status(IssueStatus.NEW)
                .note(req.getNote())
                .aiAdvice(req.getAiAdvice())
                .latitude(req.getLatitude())
                .longitude(req.getLongitude())
                .locationText(req.getLocationText())
                .imageUrls(new ArrayList<>(imageUrls))
                .build();

        Issue saved = issueRepo.save(issue);
        return toResponse(saved);
    }

    public IssueResponse getIssue(Long id) {
        Issue issue = issueRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Issue not found"));
        return toResponse(issue);
    }

    public Page<IssueResponse> myIssues(int page, int size) {
        User farmer = currentUser();
        return issueRepo.findByFarmerUsername(
                farmer.getUsername(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(this::toResponse);
    }

    public Page<IssueResponse> issueQueue(int page, int size) {
        User officer = currentUser();
        if (!hasRole(officer, "ROLE_GOVT_OFFICER") && !hasRole(officer, "ROLE_ADMIN")) {
            throw new RuntimeException("Forbidden");
        }
        return issueRepo.findByStatusIn(
                List.of(IssueStatus.NEW, IssueStatus.UNDER_REVIEW),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(this::toResponse);
    }

    public Page<IssueResponse> allIssues(int page, int size) {
        User officer = currentUser();
        if (!hasRole(officer, "ROLE_GOVT_OFFICER") && !hasRole(officer, "ROLE_ADMIN")) {
            throw new RuntimeException("Forbidden");
        }
        return issueRepo.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(this::toResponse);
    }

    public IssueResponse assignToSelf(Long issueId) {
        User officer = currentUser();
        if (!hasRole(officer, "ROLE_GOVT_OFFICER") && !hasRole(officer, "ROLE_ADMIN")) {
            throw new RuntimeException("Forbidden");
        }
        Issue issue = issueRepo.findById(issueId)
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        issue.setAssignedOfficer(officer);
        if (issue.getStatus() == IssueStatus.NEW) {
            issue.setStatus(IssueStatus.UNDER_REVIEW);
        }
        return toResponse(issueRepo.save(issue));
    }

    public IssueResponse updateReviewedDisease(Long issueId, String reviewedDisease) {
        User officer = currentUser();
        if (!hasRole(officer, "ROLE_GOVT_OFFICER") && !hasRole(officer, "ROLE_ADMIN")) {
            throw new RuntimeException("Forbidden");
        }
        Issue issue = issueRepo.findById(issueId)
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        issue.setReviewedDisease(reviewedDisease);
        issue.setDiagnosisSource(DiagnosisSource.OFFICER_REVIEWED);
        return toResponse(issueRepo.save(issue));
    }

    public IssueResponse updateStatus(Long issueId, IssueStatus newStatus) {
        User officer = currentUser();
        if (!hasRole(officer, "ROLE_GOVT_OFFICER") && !hasRole(officer, "ROLE_ADMIN")) {
            throw new RuntimeException("Forbidden");
        }
        Issue issue = issueRepo.findById(issueId)
                .orElseThrow(() -> new RuntimeException("Issue not found"));
        issue.setStatus(newStatus);
        return toResponse(issueRepo.save(issue));
    }

    public IssueResponse forwardIssue(Long issueId, String toOfficerUsername) {
        User actor = currentUser();
        if (!hasRole(actor, "ROLE_GOVT_OFFICER") && !hasRole(actor, "ROLE_ADMIN"))
            throw new RuntimeException("Forbidden");

        Issue issue = issueRepo.findById(issueId)
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        if (issue.getStatus() == IssueStatus.CLOSED || issue.getStatus() == IssueStatus.RESOLVED)
            throw new RuntimeException("Cannot forward a closed or resolved issue");

        boolean isAssigned = issue.getAssignedOfficer() != null
                && issue.getAssignedOfficer().getUsername().equals(actor.getUsername());
        if (!hasRole(actor, "ROLE_ADMIN") && !isAssigned)
            throw new RuntimeException("Only the assigned officer can forward");

        if (toOfficerUsername == null || toOfficerUsername.isBlank())
            throw new RuntimeException("toOfficerUsername is required");
        String target = toOfficerUsername.trim();
        if (target.equals(actor.getUsername()))
            throw new RuntimeException("Cannot forward to yourself");
        if (issue.getAssignedOfficer() != null && target.equals(issue.getAssignedOfficer().getUsername()))
            throw new RuntimeException("Already assigned to that officer");

        User targetUser = userRepo.findByUsername(target)
                .orElseThrow(() -> new RuntimeException("Target officer not found"));
        if (!hasRole(targetUser, "ROLE_GOVT_OFFICER") && !hasRole(targetUser, "ROLE_ADMIN"))
            throw new RuntimeException("Target user is not a govt officer");

        issue.setAssignedOfficer(targetUser);
        if (issue.getStatus() == IssueStatus.NEW)
            issue.setStatus(IssueStatus.UNDER_REVIEW);

        return toResponse(issueRepo.save(issue));
    }

    public IssueResponse createIssueForNearestOfficer(
            CreateIssueRequest req,
            List<MultipartFile> images) {
        User farmer = currentUser();
        List<String> imageUrls = fileStorageService.saveImages(images);

        List<User> officers = userRepo
                .findByRoles_NameAndLatitudeIsNotNullAndLongitudeIsNotNull("ROLE_GOVT_OFFICER");
        if (officers.isEmpty())
            throw new RuntimeException("No officers with location data available.");

        User nearest = null;
        double minDist = Double.MAX_VALUE;
        for (User officer : officers) {
            double dist = haversineKm(req.getLatitude(), req.getLongitude(),
                    officer.getLatitude(), officer.getLongitude());
            if (dist < minDist) {
                minDist = dist;
                nearest = officer;
            }
        }

        Issue issue = Issue.builder()
                .farmer(farmer)
                .predictedDisease(req.getPredictedDisease())
                .cropName(req.getCropName())
                .confidence(req.getConfidence())
                .diagnosisSource(DiagnosisSource.ML)
                .status(IssueStatus.UNDER_REVIEW)
                .assignedOfficer(nearest)
                .note(req.getNote())
                .aiAdvice(req.getAiAdvice())
                .latitude(req.getLatitude())
                .longitude(req.getLongitude())
                .locationText(req.getLocationText())
                .imageUrls(new ArrayList<>(imageUrls))
                .build();

        return toResponse(issueRepo.save(issue));
    }

    public Page<IssueResponse> issuePool(int page, int size) {
        User officer = currentUser();
        if (!hasRole(officer, "ROLE_GOVT_OFFICER") && !hasRole(officer, "ROLE_ADMIN"))
            throw new RuntimeException("Forbidden");
        return issueRepo.findByAssignedOfficerIsNullAndStatus(
                IssueStatus.NEW,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(this::toResponse);
    }

    public Page<IssueResponse> myAssignedIssues(int page, int size) {
        User officer = currentUser();
        if (!hasRole(officer, "ROLE_GOVT_OFFICER") && !hasRole(officer, "ROLE_ADMIN"))
            throw new RuntimeException("Forbidden");
        return issueRepo.findByAssignedOfficerUsername(
                officer.getUsername(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(this::toResponse);
    }

    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                        * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    public List<IssueMapMarker> getIssueMapMarkers() {
        List<Issue> issues = issueRepo.findAllWithLocation();
        return issues.stream().map(this::toMapMarker).collect(Collectors.toList());
    }

    public List<IssueMapMarker> getIssueMapMarkersByStatus(List<IssueStatus> statuses) {
        List<Issue> issues = issueRepo.findByStatusInWithLocation(statuses);
        return issues.stream().map(this::toMapMarker).collect(Collectors.toList());
    }

    private IssueMapMarker toMapMarker(Issue i) {
        ChatIssueLink link = chatIssueLinkRepo.findByIssueId(i.getId()).orElse(null);
        return IssueMapMarker.builder()
                .id(i.getId())
                .latitude(i.getLatitude())
                .longitude(i.getLongitude())
                .predictedDisease(i.getPredictedDisease())
                .reviewedDisease(i.getReviewedDisease())
                .cropName(i.getCropName())
                .status(i.getStatus().name())
                .farmerUsername(i.getFarmer().getUsername())
                .linkedChatId(link != null ? link.getChatRoom().getId() : null)
                .linkedChatTitle(link != null ? link.getChatRoom().getTitle() : null)
                .createdAt(i.getCreatedAt())
                .imageUrls(i.getImageUrls())
                .build();
    }

    private IssueResponse toResponse(Issue i) {
        ChatIssueLink link = chatIssueLinkRepo.findByIssueId(i.getId()).orElse(null);

        return IssueResponse.builder()
                .id(i.getId())
                .predictionId(i.getPredictionId())
                .farmerUsername(i.getFarmer().getUsername())
                .predictedDisease(i.getPredictedDisease())
                .reviewedDisease(i.getReviewedDisease())
                .diagnosisSource(i.getDiagnosisSource())
                .status(i.getStatus())
                .note(i.getNote())
                .aiAdvice(i.getAiAdvice())
                .latitude(i.getLatitude())
                .longitude(i.getLongitude())
                .locationText(i.getLocationText())
                .cropName(i.getCropName())
                .confidence(i.getConfidence())
                .imageUrls(i.getImageUrls())
                .assignedOfficerUsername(
                        i.getAssignedOfficer() != null ? i.getAssignedOfficer().getUsername() : null)
                .createdAt(i.getCreatedAt())
                .updatedAt(i.getUpdatedAt())
                .linkedChatId(link != null ? link.getChatRoom().getId() : null)
                .linkedChatTitle(link != null ? link.getChatRoom().getTitle() : null)
                .farmer(toUserInfo(i.getFarmer()))
                .assignedOfficer(i.getAssignedOfficer() != null ? toUserInfo(i.getAssignedOfficer()) : null)
                .build();
    }
}
