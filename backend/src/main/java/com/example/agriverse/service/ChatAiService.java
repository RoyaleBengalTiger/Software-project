package com.example.agriverse.service;

import com.example.agriverse.config.AiUserConfig;
import com.example.agriverse.model.*;
import com.example.agriverse.repository.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Async;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.*;

/**
 * Chat-specific AI service for Ollama participation in chat rooms.
 *
 * This is intentionally SEPARATE from AiAdviceService —
 * it serves a different purpose (conversational chat assistant vs. disease advice generation).
 * The only shared infrastructure is the genericWebClient bean and ollama config properties.
 */
@Slf4j
@Service
public class ChatAiService {

    private final WebClient webClient;
    private final ChatRoomRepository chatRoomRepo;
    private final ChatMessageRepository messageRepo;
    private final ChatMembershipRepository membershipRepo;
    private final ChatIssueLinkRepository issueLinkRepo;
    private final UserRepository userRepo;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${ollama.model:qwen3:8b}")
    private String ollamaModel;

    @Value("${ollama.timeout-seconds:120}")
    private int ollamaTimeoutSeconds;

    @Value("${chat.ai.context-window:30}")
    private int contextWindow;

    public ChatAiService(WebClient genericWebClient,
                         ChatRoomRepository chatRoomRepo,
                         ChatMessageRepository messageRepo,
                         ChatMembershipRepository membershipRepo,
                         ChatIssueLinkRepository issueLinkRepo,
                         UserRepository userRepo) {
        this.webClient = genericWebClient;
        this.chatRoomRepo = chatRoomRepo;
        this.messageRepo = messageRepo;
        this.membershipRepo = membershipRepo;
        this.issueLinkRepo = issueLinkRepo;
        this.userRepo = userRepo;
    }

    /**
     * Generates an AI response in the chat room context and saves it as a message.
     *
     * @param chatRoomId      the chat room ID
     * @param userMessageId   the human message ID that triggered this AI call (already saved)
     */
    @Async
    @Transactional
    public void generateAndSaveResponse(Long chatRoomId, Long userMessageId) {
        try {
            // Re-fetch entities in this transaction to ensure they are managed
            ChatRoom chatRoom = chatRoomRepo.findById(chatRoomId)
                    .orElseThrow(() -> new RuntimeException("Chat room not found: " + chatRoomId));

            ChatMessage userMessage = messageRepo.findById(userMessageId)
                    .orElseThrow(() -> new RuntimeException("User message not found: " + userMessageId));

            String prompt = buildPrompt(chatRoom, userMessage);

            log.info("Chat AI prompt length: {} chars for room {} ({})",
                    prompt.length(), chatRoom.getId(), chatRoom.getTitle());

            long start = System.nanoTime();
            String aiResponse = callOllama(prompt);
            long durationMs = (System.nanoTime() - start) / 1_000_000;

            log.info("Chat AI response took {} ms for room {}. Response length: {}",
                    durationMs, chatRoom.getId(),
                    aiResponse != null ? aiResponse.length() : "null");

            if (aiResponse == null || aiResponse.isBlank()) {
                log.warn("Ollama returned empty response for chat room {} (after stripping think tags)",
                        chatRoom.getId());
                return;
            }

            // Retrieve the Ollama system user
            User ollamaUser = userRepo.findByUsername(AiUserConfig.OLLAMA_USERNAME)
                    .orElseThrow(() -> new RuntimeException("Ollama system user not found"));

            ChatMessage aiMsg = ChatMessage.builder()
                    .chatRoom(chatRoom)
                    .sender(ollamaUser)
                    .content(aiResponse)
                    .type(MessageType.AI_RESPONSE)
                    .senderType("AI")
                    .targetType("EVERYONE")
                    .build();

            ChatMessage saved = messageRepo.save(aiMsg);
            log.info("Chat AI response saved as message {} in room {}", saved.getId(), chatRoomId);

        } catch (Exception e) {
            log.error("Chat AI generation failed for room {}: {}", chatRoomId, e.getMessage(), e);
        }
    }

    private String buildPrompt(ChatRoom chatRoom, ChatMessage userMessage) {
        StringBuilder sb = new StringBuilder();

        // System instruction
        sb.append("""
                You are Ollama, an AI agricultural assistant participating in a support chat for farmers and government officers.
                You are a visible AI participant in the room.
                Answer the currently targeted user's question using the recent room context provided.
                Be practical, clear, and concise.
                Do not pretend to be human.
                Do not invent facts.
                If information is missing, say what is missing.

                """);

        // Room context
        sb.append("--- ROOM CONTEXT ---\n");
        sb.append("Room title: ").append(chatRoom.getTitle()).append("\n");
        if (chatRoom.getDiseaseLabel() != null && !chatRoom.getDiseaseLabel().isBlank()) {
            sb.append("Disease topic: ").append(chatRoom.getDiseaseLabel()).append("\n");
        }

        // Participants
        List<ChatMembership> members = membershipRepo.findByChatRoomId(chatRoom.getId());
        sb.append("\nParticipants:\n");
        for (ChatMembership m : members) {
            sb.append("- ").append(m.getUser().getUsername())
                    .append(" (").append(m.getRoleInChat().name()).append(")\n");
        }
        sb.append("- Ollama (AI_ASSISTANT)\n");

        // Linked issues context
        List<ChatIssueLink> issueLinks = issueLinkRepo.findByChatRoomId(chatRoom.getId());
        if (!issueLinks.isEmpty()) {
            sb.append("\nLinked issues:\n");
            for (ChatIssueLink link : issueLinks) {
                Issue issue = link.getIssue();
                sb.append("- Issue #").append(issue.getId())
                        .append(": ").append(issue.getPredictedDisease())
                        .append(" on ").append(issue.getCropName() != null ? issue.getCropName() : "unknown crop")
                        .append(" (farmer: ").append(issue.getFarmer().getUsername())
                        .append(", confidence: ").append(
                                issue.getConfidence() != null
                                        ? String.format("%.0f%%", issue.getConfidence() * 100)
                                        : "N/A")
                        .append(", status: ").append(issue.getStatus().name())
                        .append(")\n");
                if (issue.getNote() != null && !issue.getNote().isBlank()) {
                    sb.append("  Note: ").append(issue.getNote()).append("\n");
                }
            }
        }

        // Recent conversation history
        List<ChatMessage> recentMessages = messageRepo.findByChatRoomIdOrderByCreatedAtDesc(
                chatRoom.getId(), PageRequest.of(0, contextWindow));
        // Reverse to chronological order
        Collections.reverse(recentMessages);

        sb.append("\n--- RECENT CONVERSATION ---\n");
        for (ChatMessage msg : recentMessages) {
            if (msg.getType() == MessageType.SYSTEM) {
                sb.append("[SYSTEM]: ").append(msg.getContent()).append("\n");
            } else {
                String senderLabel = msg.getSender().getUsername();
                if ("AI".equals(msg.getSenderType())) {
                    senderLabel = "Ollama (AI)";
                }
                sb.append(senderLabel).append(": ").append(msg.getContent()).append("\n");
            }
        }

        // Current question
        sb.append("\n--- CURRENT QUESTION ---\n");
        sb.append("Asked by: ").append(userMessage.getSender().getUsername()).append("\n");
        sb.append("Question: ").append(userMessage.getContent()).append("\n");

        sb.append("\nPlease provide a helpful, accurate response. /no_think\n");

        return sb.toString();
    }

    private String callOllama(String prompt) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", ollamaModel);
        payload.put("prompt", prompt);
        payload.put("stream", false);
        payload.put("keep_alive", "10m");

        String response = webClient.post()
                .uri(ollamaBaseUrl + "/api/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(ollamaTimeoutSeconds))
                .block();

        if (response == null) {
            throw new RuntimeException("Ollama returned null response");
        }

        try {
            JsonNode root = objectMapper.readTree(response);

            long totalNs = root.path("total_duration").asLong(0);
            int evalTokens = root.path("eval_count").asInt(0);
            log.info("Chat AI Ollama: total={} ms, eval_tokens={}",
                    totalNs / 1_000_000, evalTokens);

            String text = root.path("response").asText("");
            log.debug("Chat AI raw response length: {}", text.length());

            // Strip any <think> blocks the model may produce
            text = text.replaceAll("(?s)<think>.*?</think>", "").strip();
            return text;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Ollama chat response: " + e.getMessage(), e);
        }
    }
}
