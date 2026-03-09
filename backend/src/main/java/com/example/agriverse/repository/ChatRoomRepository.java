package com.example.agriverse.repository;

import com.example.agriverse.model.ChatRoom;
import com.example.agriverse.model.ChatRoomStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    Page<ChatRoom> findByStatus(ChatRoomStatus status, Pageable pageable);

    @Query("SELECT cr FROM ChatRoom cr WHERE cr.status = :status AND cr.diseaseLabel = :diseaseLabel")
    List<ChatRoom> findByStatusAndDiseaseLabel(
            @Param("status") ChatRoomStatus status,
            @Param("diseaseLabel") String diseaseLabel);

    @Query("SELECT cr FROM ChatRoom cr JOIN ChatMembership cm ON cm.chatRoom = cr WHERE cm.user.id = :userId")
    Page<ChatRoom> findByMemberUserId(@Param("userId") Long userId, Pageable pageable);

    Page<ChatRoom> findByCreatedByOfficerUsername(String username, Pageable pageable);
}
