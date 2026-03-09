package com.example.agriverse.repository;

import com.example.agriverse.model.ChatMembership;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChatMembershipRepository extends JpaRepository<ChatMembership, Long> {

    List<ChatMembership> findByChatRoomId(Long chatRoomId);

    Optional<ChatMembership> findByChatRoomIdAndUserId(Long chatRoomId, Long userId);

    boolean existsByChatRoomIdAndUserId(Long chatRoomId, Long userId);

    List<ChatMembership> findByUserId(Long userId);
}
