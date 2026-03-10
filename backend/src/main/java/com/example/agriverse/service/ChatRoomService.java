package com.example.agriverse.service;

import com.example.agriverse.dto.*;
import com.example.agriverse.config.AiUserConfig;
import com.example.agriverse.model.*;
import com.example.agriverse.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatRoomService {

    private final ChatRoomRepository chatRoomRepo;
    private final ChatMembershipRepository membershipRepo;
    private final ChatIssueLinkRepository chatIssueLinkRepo;
    private final ChatMessageRepository messageRepo;
    private final IssueRepository issueRepo;
    private final UserRepository userRepo;
    private final ChatAiService chatAiService;

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

    private ChatRole resolveChatRole(User user) {
        if (hasRole(user, "ROLE_ADMIN")) return ChatRole.ADMIN;
        if (hasRole(user, "ROLE_GOVT_OFFICER")) return ChatRole.OFFICER;
        return ChatRole.FARMER;
    }

    @Transactional
    public ChatRoomResponse createChatFromIssues(CreateChatFromIssuesRequest req) {
        User officer = currentUser();
        if (!hasRole(officer, "ROLE_GOVT_OFFICER") && !hasRole(officer, "ROLE_ADMIN")) {
            throw new RuntimeException("Forbidden");
        }

        List<Issue> issues = issueRepo.findByIdIn(req.getIssueIds());
        if (issues.isEmpty()) {
            throw new RuntimeException("No valid issues found");
        }

        // Create the chat room
        ChatRoom chatRoom = ChatRoom.builder()
                .title(req.getTitle())
                .diseaseLabel(req.getDiseaseLabel())
                .createdByOfficer(officer)
                .status(ChatRoomStatus.ACTIVE)
                .build();
        chatRoom = chatRoomRepo.save(chatRoom);

        // Add officer as member
        membershipRepo.save(ChatMembership.builder()
                .chatRoom(chatRoom)
                .user(officer)
                .roleInChat(resolveChatRole(officer))
                .build());

        // Link issues and add farmers as members
        for (Issue issue : issues) {
            // Check if issue is already linked to an active chat
            if (chatIssueLinkRepo.existsByIssueId(issue.getId())) {
                continue; // skip already-linked issues
            }

            chatIssueLinkRepo.save(ChatIssueLink.builder()
                    .chatRoom(chatRoom)
                    .issue(issue)
                    .linkedByOfficer(officer)
                    .build());

            issue.setStatus(IssueStatus.GROUPED_IN_CHAT);
            issueRepo.save(issue);

            // Add farmer as member if not already
            User farmer = issue.getFarmer();
            if (!membershipRepo.existsByChatRoomIdAndUserId(chatRoom.getId(), farmer.getId())) {
                membershipRepo.save(ChatMembership.builder()
                        .chatRoom(chatRoom)
                        .user(farmer)
                        .roleInChat(ChatRole.FARMER)
                        .build());
            }
        }

        // Add system message
        final ChatRoom savedRoom = chatRoom;
        messageRepo.save(ChatMessage.builder()
                .chatRoom(savedRoom)
                .sender(officer)
                .content("Chat created by " + officer.getUsername() + " with " + issues.size() + " issue(s).")
                .type(MessageType.SYSTEM)
                .build());

        return toResponse(savedRoom);
    }

    @Transactional
    public ChatRoomResponse addIssuesToChat(Long chatRoomId, AddIssuesToChatRequest req) {
        User officer = currentUser();
        if (!hasRole(officer, "ROLE_GOVT_OFFICER") && !hasRole(officer, "ROLE_ADMIN")) {
            throw new RuntimeException("Forbidden");
        }

        ChatRoom chatRoom = chatRoomRepo.findById(chatRoomId)
                .orElseThrow(() -> new RuntimeException("Chat room not found"));

        if (chatRoom.getStatus() != ChatRoomStatus.ACTIVE) {
            throw new RuntimeException("Chat room is closed");
        }

        List<Issue> issues = issueRepo.findByIdIn(req.getIssueIds());
        int linkedCount = 0;

        for (Issue issue : issues) {
            if (chatIssueLinkRepo.existsByChatRoomIdAndIssueId(chatRoom.getId(), issue.getId())) {
                continue;
            }

            // If already linked to another chat, skip
            if (chatIssueLinkRepo.existsByIssueId(issue.getId())) {
                continue;
            }

            chatIssueLinkRepo.save(ChatIssueLink.builder()
                    .chatRoom(chatRoom)
                    .issue(issue)
                    .linkedByOfficer(officer)
                    .build());

            issue.setStatus(IssueStatus.GROUPED_IN_CHAT);
            issueRepo.save(issue);

            User farmer = issue.getFarmer();
            if (!membershipRepo.existsByChatRoomIdAndUserId(chatRoom.getId(), farmer.getId())) {
                membershipRepo.save(ChatMembership.builder()
                        .chatRoom(chatRoom)
                        .user(farmer)
                        .roleInChat(ChatRole.FARMER)
                        .build());
            }

            linkedCount++;
        }

        if (linkedCount > 0) {
            messageRepo.save(ChatMessage.builder()
                    .chatRoom(chatRoom)
                    .sender(officer)
                    .content(officer.getUsername() + " added " + linkedCount + " issue(s) to this chat.")
                    .type(MessageType.SYSTEM)
                    .build());
        }

        return toResponse(chatRoom);
    }

    public ChatRoomResponse getChatRoom(Long id) {
        // Any authenticated user can read public chats
        currentUser();
        ChatRoom chatRoom = chatRoomRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Chat room not found"));
        return toResponse(chatRoom);
    }

    public Page<ChatRoomResponse> listChatRooms(int page, int size) {
        currentUser();
        return chatRoomRepo.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(this::toResponse);
    }

    public Page<ChatRoomResponse> myChatRooms(int page, int size) {
        User user = currentUser();
        return chatRoomRepo.findByMemberUserId(
                user.getId(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(this::toResponse);
    }

    public Page<ChatRoomResponse> activeChatRooms(int page, int size) {
        currentUser();
        return chatRoomRepo.findByStatus(
                ChatRoomStatus.ACTIVE,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(this::toResponse);
    }

    public List<ChatRoomResponse> activeChatsByDisease(String diseaseLabel) {
        currentUser();
        return chatRoomRepo.findByStatusAndDiseaseLabel(ChatRoomStatus.ACTIVE, diseaseLabel)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public Page<ChatMessageResponse> getMessages(Long chatRoomId, int page, int size) {
        // Any authenticated user can read messages (public read)
        currentUser();
        chatRoomRepo.findById(chatRoomId)
                .orElseThrow(() -> new RuntimeException("Chat room not found"));

        return messageRepo.findByChatRoomIdOrderByCreatedAtAsc(
                chatRoomId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "createdAt")))
                .map(this::toMessageResponse);
    }

    public ChatMessageResponse sendMessage(Long chatRoomId, SendChatMessageRequest req) {
        User sender = currentUser();

        ChatRoom chatRoom = chatRoomRepo.findById(chatRoomId)
                .orElseThrow(() -> new RuntimeException("Chat room not found"));

        if (chatRoom.getStatus() != ChatRoomStatus.ACTIVE) {
            throw new RuntimeException("Chat room is closed");
        }

        // Only members can send messages
        if (!membershipRepo.existsByChatRoomIdAndUserId(chatRoomId, sender.getId())) {
            throw new RuntimeException("Only chat members can send messages");
        }

        // Prevent clients from spoofing as the AI user
        if (AiUserConfig.OLLAMA_USERNAME.equals(sender.getUsername())) {
            throw new RuntimeException("Cannot send messages as the AI user");
        }

        boolean targetingOllama = req.isTargetOllama();

        ChatMessage message = ChatMessage.builder()
                .chatRoom(chatRoom)
                .sender(sender)
                .content(req.getContent().trim())
                .type(MessageType.TEXT)
                .senderType("USER")
                .targetType(targetingOllama ? "OLLAMA" : "EVERYONE")
                .build();

        message = messageRepo.save(message);

        // If targeting Ollama, trigger AI response asynchronously.
        // The @Async method runs on Spring's managed thread pool with proper
        // transaction context. The HTTP response returns immediately with the
        // user's message; Ollama's reply will appear via the frontend's polling.
        if (targetingOllama) {
            chatAiService.generateAndSaveResponse(chatRoom.getId(), message.getId());
        }

        return toMessageResponse(message);
    }

    @Transactional
    public ChatRoomResponse closeChat(Long chatRoomId) {
        User officer = currentUser();
        if (!hasRole(officer, "ROLE_GOVT_OFFICER") && !hasRole(officer, "ROLE_ADMIN")) {
            throw new RuntimeException("Forbidden");
        }

        ChatRoom chatRoom = chatRoomRepo.findById(chatRoomId)
                .orElseThrow(() -> new RuntimeException("Chat room not found"));

        // Only officers who are members of this chat can close it
        if (!membershipRepo.existsByChatRoomIdAndUserId(chatRoomId, officer.getId())) {
            throw new RuntimeException("Only officers associated with this chat can close it");
        }

        chatRoom.setStatus(ChatRoomStatus.CLOSED);
        chatRoom = chatRoomRepo.save(chatRoom);

        messageRepo.save(ChatMessage.builder()
                .chatRoom(chatRoom)
                .sender(officer)
                .content("Chat closed by " + officer.getUsername())
                .type(MessageType.SYSTEM)
                .build());

        return toResponse(chatRoom);
    }

    @Transactional
    public ChatRoomResponse transferChat(Long chatRoomId, String toOfficerUsername) {
        User currentOfficer = currentUser();
        if (!hasRole(currentOfficer, "ROLE_GOVT_OFFICER") && !hasRole(currentOfficer, "ROLE_ADMIN")) {
            throw new RuntimeException("Forbidden");
        }

        ChatRoom chatRoom = chatRoomRepo.findById(chatRoomId)
                .orElseThrow(() -> new RuntimeException("Chat room not found"));

        if (chatRoom.getStatus() != ChatRoomStatus.ACTIVE) {
            throw new RuntimeException("Cannot transfer a closed chat room");
        }

        if (!membershipRepo.existsByChatRoomIdAndUserId(chatRoomId, currentOfficer.getId())) {
            throw new RuntimeException("You are not a member of this chat room");
        }

        User targetOfficer = userRepo.findByUsername(toOfficerUsername)
                .orElseThrow(() -> new RuntimeException("Target officer not found"));

        if (!hasRole(targetOfficer, "ROLE_GOVT_OFFICER") && !hasRole(targetOfficer, "ROLE_ADMIN")) {
            throw new RuntimeException("Target user is not a government officer");
        }

        if (targetOfficer.getId().equals(currentOfficer.getId())) {
            throw new RuntimeException("Cannot transfer to yourself");
        }

        // Remove current officer's membership
        ChatMembership currentMembership = membershipRepo
                .findByChatRoomIdAndUserId(chatRoomId, currentOfficer.getId())
                .orElseThrow(() -> new RuntimeException("Membership not found"));
        membershipRepo.delete(currentMembership);

        // Add new officer as member
        if (!membershipRepo.existsByChatRoomIdAndUserId(chatRoomId, targetOfficer.getId())) {
            membershipRepo.save(ChatMembership.builder()
                    .chatRoom(chatRoom)
                    .user(targetOfficer)
                    .roleInChat(resolveChatRole(targetOfficer))
                    .build());
        }

        messageRepo.save(ChatMessage.builder()
                .chatRoom(chatRoom)
                .sender(currentOfficer)
                .content(currentOfficer.getUsername() + " transferred this chat to " + targetOfficer.getUsername())
                .type(MessageType.SYSTEM)
                .build());

        return toResponse(chatRoom);
    }

    @Transactional
    public ChatRoomResponse removeIssueFromChat(Long chatRoomId, Long issueId, String reassignToUsername) {
        User actor = currentUser();
        if (!hasRole(actor, "ROLE_GOVT_OFFICER") && !hasRole(actor, "ROLE_ADMIN"))
            throw new RuntimeException("Forbidden");

        ChatRoom chatRoom = chatRoomRepo.findById(chatRoomId)
                .orElseThrow(() -> new RuntimeException("Chat room not found"));

        if (chatRoom.getStatus() != ChatRoomStatus.ACTIVE)
            throw new RuntimeException("Cannot modify a closed chat room");

        if (!membershipRepo.existsByChatRoomIdAndUserId(chatRoomId, actor.getId()))
            throw new RuntimeException("You are not a member of this chat room");

        ChatIssueLink link = chatIssueLinkRepo.findByChatRoomIdAndIssueId(chatRoomId, issueId)
                .orElseThrow(() -> new RuntimeException("Issue is not linked to this chat room"));

        Issue issue = link.getIssue();

        // Remove the link
        chatIssueLinkRepo.delete(link);

        // Reassign issue
        if (reassignToUsername != null && !reassignToUsername.isBlank()) {
            String target = reassignToUsername.trim();
            User targetUser = userRepo.findByUsername(target)
                    .orElseThrow(() -> new RuntimeException("Target officer not found"));
            if (!hasRole(targetUser, "ROLE_GOVT_OFFICER") && !hasRole(targetUser, "ROLE_ADMIN"))
                throw new RuntimeException("Target user is not a government officer");

            issue.setAssignedOfficer(targetUser);
            issue.setStatus(IssueStatus.UNDER_REVIEW);
        } else {
            // Send to pool
            issue.setAssignedOfficer(null);
            issue.setStatus(IssueStatus.NEW);
        }
        issueRepo.save(issue);

        // Post system message
        String action = (reassignToUsername != null && !reassignToUsername.isBlank())
                ? "reassigned issue #" + issueId + " to " + reassignToUsername.trim()
                : "sent issue #" + issueId + " to the pool";
        messageRepo.save(ChatMessage.builder()
                .chatRoom(chatRoom)
                .sender(actor)
                .content(actor.getUsername() + " removed and " + action)
                .type(MessageType.SYSTEM)
                .build());

        return toResponse(chatRoom);
    }

    private ChatRoomResponse toResponse(ChatRoom cr) {
        List<ChatMembership> members = membershipRepo.findByChatRoomId(cr.getId());
        List<ChatIssueLink> links = chatIssueLinkRepo.findByChatRoomId(cr.getId());

        List<ChatMemberResponse> memberList = new ArrayList<>(members.stream().map(m -> ChatMemberResponse.builder()
                .userId(m.getUser().getId())
                .username(m.getUser().getUsername())
                .roleInChat(m.getRoleInChat())
                .joinedAt(m.getJoinedAt())
                .build())
                .collect(Collectors.toList()));

        // Add Ollama as a pseudo-member (always present in every chat room)
        memberList.add(ChatMemberResponse.builder()
                .userId(-1L)
                .username(AiUserConfig.OLLAMA_USERNAME)
                .roleInChat(ChatRole.AI_ASSISTANT)
                .joinedAt(cr.getCreatedAt())
                .build());

        return ChatRoomResponse.builder()
                .id(cr.getId())
                .title(cr.getTitle())
                .diseaseLabel(cr.getDiseaseLabel())
                .createdByOfficerUsername(cr.getCreatedByOfficer().getUsername())
                .status(cr.getStatus())
                .createdAt(cr.getCreatedAt())
                .updatedAt(cr.getUpdatedAt())
                .members(memberList)
                .linkedIssues(links.stream().map(l -> ChatIssueInfo.builder()
                        .issueId(l.getIssue().getId())
                        .farmerUsername(l.getIssue().getFarmer().getUsername())
                        .predictedDisease(l.getIssue().getPredictedDisease())
                        .issueStatus(l.getIssue().getStatus())
                        .latitude(l.getIssue().getLatitude())
                        .longitude(l.getIssue().getLongitude())
                        .build())
                        .collect(Collectors.toList()))
                .build();
    }

    private ChatMessageResponse toMessageResponse(ChatMessage m) {
        String senderRole = m.getSender().getRoles().stream()
                .findFirst().map(Role::getName).orElse(null);

        // For AI-sent messages, override the role label
        if ("AI".equals(m.getSenderType())) {
            senderRole = "AI_ASSISTANT";
        }

        return ChatMessageResponse.builder()
                .id(m.getId())
                .chatRoomId(m.getChatRoom().getId())
                .senderUsername(m.getSender().getUsername())
                .senderRole(senderRole)
                .senderType(m.getSenderType())
                .targetType(m.getTargetType())
                .content(m.getContent())
                .type(m.getType())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
