package com.example.agriverse.service;

import com.example.agriverse.dto.ml.AdviceResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

@Slf4j
@Service
public class AiAdviceService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${ollama.model:qwen3:8b}")
    private String ollamaModel;

    @Value("${ollama.temperature:0.3}")
    private double ollamaTemperature;

    @Value("${ollama.num-ctx:16384}")
    private int ollamaNumCtx;

    @Value("${ollama.timeout-seconds:120}")
    private int ollamaTimeoutSeconds;

    // Disease class label -> knowledge text
    private final Map<String, String> knowledgeBase = new HashMap<>();
    private String crossCuttingKnowledge = "";

    public AiAdviceService(WebClient genericWebClient) {
        this.webClient = genericWebClient;
    }

    @PostConstruct
    void loadKnowledgeBase() {
        try {
            PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
            Resource[] resources = resolver.getResources("classpath:knowledge/*.txt");

            for (Resource resource : resources) {
                String filename = resource.getFilename();
                if (filename == null) continue;

                String key = filename.replace(".txt", "");
                String content = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);

                if ("cross_cutting".equals(key)) {
                    crossCuttingKnowledge = content;
                } else {
                    knowledgeBase.put(key, content);
                }
            }

            log.info("Loaded {} disease knowledge entries + cross-cutting guidance", knowledgeBase.size());
        } catch (IOException e) {
            log.warn("Failed to load knowledge base files: {}", e.getMessage());
        }
    }

    /**
     * Generate structured advice using local Ollama model grounded in the knowledge base.
     */
    public AdviceResponse getAdvice(String cropName, String diseaseName, Double confidence) {
        try {
            String knowledge = retrieveKnowledge(cropName, diseaseName);
            String prompt = buildPrompt(cropName, diseaseName, confidence, knowledge);
            String rawResponse = callOllama(prompt);
            return parseAdviceResponse(rawResponse);
        } catch (Exception e) {
            log.error("Ollama advice generation failed: {}", e.getMessage());
            return fallbackAdvice(cropName, diseaseName, confidence);
        }
    }

    private String retrieveKnowledge(String cropName, String diseaseName) {
        // Try exact match with the ML classifier label format: "Crop___Disease"
        // The prediction comes as "Tomato___Early_blight", the knowledge files use the same key
        String classLabel = cropName + "___" + diseaseName;
        // Normalize: remove spaces from crop/disease for matching
        String normalizedLabel = classLabel.replace(" ", "_");

        // Try exact match first
        if (knowledgeBase.containsKey(normalizedLabel)) {
            return knowledgeBase.get(normalizedLabel);
        }

        // Try just disease name (for rice diseases like Bacterialblight, Blast, etc.)
        String diseaseOnly = diseaseName.replace(" ", "");
        if (knowledgeBase.containsKey(diseaseOnly)) {
            return knowledgeBase.get(diseaseOnly);
        }

        // Try case-insensitive search
        for (Map.Entry<String, String> entry : knowledgeBase.entrySet()) {
            if (entry.getKey().equalsIgnoreCase(normalizedLabel)
                    || entry.getKey().equalsIgnoreCase(diseaseOnly)) {
                return entry.getValue();
            }
        }

        // Fuzzy: check if any key contains the disease name
        String diseaseLower = diseaseName.toLowerCase().replace(" ", "").replace("_", "");
        for (Map.Entry<String, String> entry : knowledgeBase.entrySet()) {
            String keyLower = entry.getKey().toLowerCase().replace("_", "");
            if (keyLower.contains(diseaseLower) || diseaseLower.contains(keyLower)) {
                return entry.getValue();
            }
        }

        log.warn("No knowledge base entry found for crop='{}', disease='{}'", cropName, diseaseName);
        return "";
    }

    private String buildPrompt(String cropName, String diseaseName, Double confidence, String knowledge) {
        String confidenceNote = "";
        if (confidence != null && confidence < 0.7) {
            confidenceNote = "\nIMPORTANT: The prediction confidence is LOW (" +
                    String.format("%.0f%%", confidence * 100) +
                    "). Mention this uncertainty and suggest the farmer verify the diagnosis with a local expert.";
        }

        return """
                You are an agricultural advisor helping farmers in Bangladesh. \
                A disease prediction system has analyzed a leaf image and returned the following result.

                Crop: %s
                Predicted Disease: %s
                Confidence: %s%s

                === KNOWLEDGE BASE (use this as primary source of truth) ===
                %s

                === CROSS-CUTTING GUIDANCE ===
                %s

                === INSTRUCTIONS ===
                - Use the predicted disease as the PRIMARY diagnosis. Do NOT invent a different disease.
                - Base your advice on the knowledge base above. Prefer knowledge base content over your general knowledge.
                - Keep language simple, practical, and farmer-friendly.
                - Provide practical treatment and prevention advice.
                - Do NOT recommend specific chemical dosages unless explicitly stated in the knowledge base.
                - If a chemical is mentioned in the knowledge base, tell the farmer to follow the local label and guidance.

                You MUST respond with ONLY a valid JSON object (no markdown, no explanation outside the JSON) in this exact format:
                {
                  "summary": "A brief 2-3 sentence summary of what the disease is and its impact",
                  "immediate_actions": ["action 1", "action 2", "action 3"],
                  "prevention": ["prevention measure 1", "prevention measure 2"],
                  "why_this_happens": ["cause 1", "cause 2"],
                  "when_to_escalate": "When the farmer should seek professional help"
                }

                Respond with ONLY the JSON object. No other text. /no_think
                """.formatted(
                cropName,
                diseaseName,
                confidence != null ? String.format("%.0f%%", confidence * 100) : "N/A",
                confidenceNote,
                knowledge.isEmpty() ? "No specific knowledge available for this disease." : knowledge,
                crossCuttingKnowledge.isEmpty() ? "N/A" : crossCuttingKnowledge
        );
    }

    private String callOllama(String prompt) {
        Map<String, Object> options = new LinkedHashMap<>();
        options.put("temperature", ollamaTemperature);
        options.put("num_ctx", ollamaNumCtx);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", ollamaModel);
        payload.put("prompt", prompt);
        payload.put("stream", false);
        payload.put("options", options);

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

        // Ollama returns { "response": "...", ... }
        try {
            JsonNode root = objectMapper.readTree(response);
            return root.path("response").asText("");
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Ollama response: " + e.getMessage());
        }
    }

    AdviceResponse parseAdviceResponse(String raw) {
        // Strip markdown code fences if present
        String cleaned = raw.strip();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceFirst("```[a-zA-Z]*\\s*", "");
            if (cleaned.endsWith("```")) {
                cleaned = cleaned.substring(0, cleaned.lastIndexOf("```"));
            }
            cleaned = cleaned.strip();
        }

        // Try to find JSON object in the response
        int braceStart = cleaned.indexOf('{');
        int braceEnd = cleaned.lastIndexOf('}');
        if (braceStart >= 0 && braceEnd > braceStart) {
            cleaned = cleaned.substring(braceStart, braceEnd + 1);
        }

        try {
            JsonNode json = objectMapper.readTree(cleaned);

            return AdviceResponse.builder()
                    .summary(json.path("summary").asText("No summary available."))
                    .immediateActions(jsonArrayToList(json.path("immediate_actions")))
                    .prevention(jsonArrayToList(json.path("prevention")))
                    .whyThisHappens(jsonArrayToList(json.path("why_this_happens")))
                    .whenToEscalate(json.path("when_to_escalate").asText("Consult a local agricultural officer if symptoms persist or worsen."))
                    .build();
        } catch (Exception e) {
            log.warn("Failed to parse Ollama JSON response, using raw text. Error: {}", e.getMessage());
            // Fallback: wrap the raw text as a summary
            return AdviceResponse.builder()
                    .summary(raw.length() > 500 ? raw.substring(0, 500) + "..." : raw)
                    .immediateActions(List.of("Please consult a local agricultural officer for specific guidance."))
                    .prevention(List.of("Follow general crop hygiene practices."))
                    .whyThisHappens(List.of("See the summary above for details."))
                    .whenToEscalate("If symptoms worsen or spread rapidly, contact your nearest agricultural officer.")
                    .build();
        }
    }

    private List<String> jsonArrayToList(JsonNode node) {
        List<String> result = new ArrayList<>();
        if (node.isArray()) {
            for (JsonNode item : node) {
                result.add(item.asText());
            }
        }
        if (result.isEmpty()) {
            result.add("Consult a local agricultural expert for detailed guidance.");
        }
        return result;
    }

    private AdviceResponse fallbackAdvice(String cropName, String diseaseName, Double confidence) {
        String confText = confidence != null ? String.format(" (confidence: %.0f%%)", confidence * 100) : "";
        return AdviceResponse.builder()
                .summary("The AI advice system is temporarily unavailable. The prediction indicates " +
                        diseaseName + " on " + cropName + confText +
                        ". Please review the details with a local agricultural officer.")
                .immediateActions(List.of(
                        "Monitor affected plants closely.",
                        "Avoid spreading potential infection to healthy plants.",
                        "Contact your local agricultural officer for guidance."
                ))
                .prevention(List.of(
                        "Follow general crop hygiene practices.",
                        "Use disease-resistant varieties when available."
                ))
                .whyThisHappens(List.of(
                        "Detailed analysis is unavailable at the moment. The prediction system has identified potential symptoms."
                ))
                .whenToEscalate("Contact your nearest agricultural office for professional diagnosis and treatment advice.")
                .build();
    }
}
