package com.example.agriverse.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "issues")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Issue {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "issue_seq_gen")
    @SequenceGenerator(name = "issue_seq_gen", sequenceName = "issue_seq", allocationSize = 1)
    private Long id;

    @Column(name = "prediction_id")
    private Long predictionId;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "farmer_user_id", nullable = false)
    private User farmer;

    @Column(nullable = false, length = 200)
    private String predictedDisease;

    @Column(length = 200)
    private String reviewedDisease;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private DiagnosisSource diagnosisSource = DiagnosisSource.ML;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private IssueStatus status = IssueStatus.NEW;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(length = 200)
    private String locationText;

    @Column(length = 120)
    private String cropName;

    @Column
    private Double confidence;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "issue_image_urls", joinColumns = @JoinColumn(name = "issue_id"))
    @Column(name = "image_url", length = 500)
    @Builder.Default
    private List<String> imageUrls = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_officer_user_id")
    private User assignedOfficer;

    @Column(nullable = false)
    private Instant createdAt;

    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
        if (status == null)
            status = IssueStatus.NEW;
        if (diagnosisSource == null)
            diagnosisSource = DiagnosisSource.ML;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
