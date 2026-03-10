package com.example.agriverse.repository;

import com.example.agriverse.model.ChatIssueLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChatIssueLinkRepository extends JpaRepository<ChatIssueLink, Long> {

    List<ChatIssueLink> findByChatRoomId(Long chatRoomId);

    Optional<ChatIssueLink> findByIssueId(Long issueId);

    boolean existsByIssueId(Long issueId);

    boolean existsByChatRoomIdAndIssueId(Long chatRoomId, Long issueId);

    Optional<ChatIssueLink> findByChatRoomIdAndIssueId(Long chatRoomId, Long issueId);
}
