package com.example.agriverse.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "chat_memberships", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "chat_room_id", "user_id" })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMembership {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "chat_member_seq_gen")
    @SequenceGenerator(name = "chat_member_seq_gen", sequenceName = "chat_member_seq", allocationSize = 1)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_room_id", nullable = false)
    private ChatRoom chatRoom;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ChatRole roleInChat;

    @Column(nullable = false)
    private Instant joinedAt;

    @PrePersist
    void onCreate() {
        if (joinedAt == null)
            joinedAt = Instant.now();
    }
}
