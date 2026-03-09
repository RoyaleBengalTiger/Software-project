package com.example.agriverse.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "chat_issue_links", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "chat_room_id", "issue_id" })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatIssueLink {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "chat_issue_link_seq_gen")
    @SequenceGenerator(name = "chat_issue_link_seq_gen", sequenceName = "chat_issue_link_seq", allocationSize = 1)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id", nullable = false)
    private ChatRoom chatRoom;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "issue_id", nullable = false)
    private Issue issue;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "linked_by_officer_id", nullable = false)
    private User linkedByOfficer;

    @Column(nullable = false)
    private Instant linkedAt;

    @PrePersist
    void onCreate() {
        if (linkedAt == null)
            linkedAt = Instant.now();
    }
}
