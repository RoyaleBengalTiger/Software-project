package com.example.agriverse.controller;

import com.example.agriverse.dto.AddIssuesToChatRequest;
import com.example.agriverse.dto.CreateChatFromIssuesRequest;
import com.example.agriverse.dto.SendChatMessageRequest;
import com.example.agriverse.service.ChatRoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chats")
@RequiredArgsConstructor
public class ChatRoomController {

    private final ChatRoomService chatRoomService;

    @PreAuthorize("hasAnyRole('GOVT_OFFICER','ADMIN')")
    @PostMapping
    public ResponseEntity<?> createFromIssues(@RequestBody CreateChatFromIssuesRequest req) {
        return ResponseEntity.ok(chatRoomService.createChatFromIssues(req));
    }

    @PreAuthorize("hasAnyRole('GOVT_OFFICER','ADMIN')")
    @PostMapping("/{id}/add-issues")
    public ResponseEntity<?> addIssues(
            @PathVariable Long id,
            @RequestBody AddIssuesToChatRequest req) {
        return ResponseEntity.ok(chatRoomService.addIssuesToChat(id, req));
    }

    @PreAuthorize("hasAnyRole('USER','GOVT_OFFICER','ADMIN')")
    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(chatRoomService.getChatRoom(id));
    }

    @PreAuthorize("hasAnyRole('USER','GOVT_OFFICER','ADMIN')")
    @GetMapping
    public ResponseEntity<?> listAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(chatRoomService.listChatRooms(page, size));
    }

    @PreAuthorize("hasAnyRole('USER','GOVT_OFFICER','ADMIN')")
    @GetMapping("/mine")
    public ResponseEntity<?> myChatRooms(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(chatRoomService.myChatRooms(page, size));
    }

    @PreAuthorize("hasAnyRole('USER','GOVT_OFFICER','ADMIN')")
    @GetMapping("/active")
    public ResponseEntity<?> activeChatRooms(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(chatRoomService.activeChatRooms(page, size));
    }

    @PreAuthorize("hasAnyRole('GOVT_OFFICER','ADMIN')")
    @GetMapping("/by-disease")
    public ResponseEntity<?> byDisease(@RequestParam String diseaseLabel) {
        return ResponseEntity.ok(chatRoomService.activeChatsByDisease(diseaseLabel));
    }

    @PreAuthorize("hasAnyRole('USER','GOVT_OFFICER','ADMIN')")
    @GetMapping("/{id}/messages")
    public ResponseEntity<?> messages(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(chatRoomService.getMessages(id, page, size));
    }

    @PreAuthorize("hasAnyRole('USER','GOVT_OFFICER','ADMIN')")
    @PostMapping("/{id}/messages")
    public ResponseEntity<?> sendMessage(
            @PathVariable Long id,
            @RequestBody SendChatMessageRequest req) {
        return ResponseEntity.ok(chatRoomService.sendMessage(id, req));
    }

    @PreAuthorize("hasAnyRole('GOVT_OFFICER','ADMIN')")
    @PostMapping("/{id}/close")
    public ResponseEntity<?> closeChat(@PathVariable Long id) {
        return ResponseEntity.ok(chatRoomService.closeChat(id));
    }

    @PreAuthorize("hasAnyRole('GOVT_OFFICER','ADMIN')")
    @PostMapping("/{id}/transfer")
    public ResponseEntity<?> transferChat(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body) {
        String toOfficerUsername = body.get("toOfficerUsername");
        if (toOfficerUsername == null || toOfficerUsername.isBlank()) {
            return ResponseEntity.badRequest().body("toOfficerUsername is required");
        }
        return ResponseEntity.ok(chatRoomService.transferChat(id, toOfficerUsername));
    }
}
