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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class AiAdviceService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${ollama.model:qwen3:8b}")
    private String ollamaModel;

    @Value("${ollama.timeout-seconds:120}")
    private int ollamaTimeoutSeconds;

    // Loaded once at startup
    private final Map<String, String> knowledgeBase = new HashMap<>();

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
                if ("cross_cutting".equalsIgnoreCase(key)) {
                    continue; // no longer used in prompt
                }

                String content = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                knowledgeBase.put(key, content);
            }

            log.info("Loaded {} disease knowledge entries", knowledgeBase.size());
        } catch (IOException e) {
            log.warn("Failed to load knowledge base files: {}", e.getMessage());
        }
    }

    /**
     * Generates both English and Bangla advice in a single Ollama call.
     * Bangla must be a direct translation of the English advice.
     */
    public AdviceResponse getAdvice(String cropName, String diseaseName, Double confidence) {
        try {
            String knowledge = retrieveKnowledge(cropName, diseaseName);
            String prompt = buildPrompt(cropName, diseaseName, confidence, knowledge);

            log.info("Advice prompt length: {} chars", prompt.length());

            long start = System.nanoTime();
            String rawResponse = callOllama(prompt);
            long end = System.nanoTime();

            long durationMs = (end - start) / 1_000_000;
            log.info("Ollama response took {} ms", durationMs);

            return parseAdviceResponse(rawResponse);
        } catch (Exception e) {
            log.error("Ollama advice generation failed: {}", e.getMessage(), e);
            return fallbackAdvice(cropName, diseaseName, confidence);
        }
    }

    /**
     * Retrieves only the associated disease knowledge for the current prediction.
     */
    private String retrieveKnowledge(String cropName, String diseaseName) {
        List<String> candidates = buildKnowledgeKeyCandidates(cropName, diseaseName);

        // Exact match
        for (String candidate : candidates) {
            if (knowledgeBase.containsKey(candidate)) {
                log.info("Knowledge base matched exact key: {}", candidate);
                return knowledgeBase.get(candidate);
            }
        }

        // Case-insensitive exact match
        for (Map.Entry<String, String> entry : knowledgeBase.entrySet()) {
            for (String candidate : candidates) {
                if (entry.getKey().equalsIgnoreCase(candidate)) {
                    log.info("Knowledge base matched case-insensitive key: {}", entry.getKey());
                    return entry.getValue();
                }
            }
        }

        // Normalized fuzzy contains match
        List<String> normalizedCandidates = candidates.stream()
                .map(this::normalizeLoose)
                .toList();

        for (Map.Entry<String, String> entry : knowledgeBase.entrySet()) {
            String entryNorm = normalizeLoose(entry.getKey());

            for (String candidateNorm : normalizedCandidates) {
                if (entryNorm.equals(candidateNorm)
                        || entryNorm.contains(candidateNorm)
                        || candidateNorm.contains(entryNorm)) {
                    log.info("Knowledge base matched fuzzy key: {}", entry.getKey());
                    return entry.getValue();
                }
            }
        }

        log.warn("No knowledge base entry found for crop='{}', disease='{}'", cropName, diseaseName);
        return "";
    }

    private List<String> buildKnowledgeKeyCandidates(String cropName, String diseaseName) {
        List<String> candidates = new ArrayList<>();

        String crop = cropName == null ? "" : cropName.trim();
        String disease = diseaseName == null ? "" : diseaseName.trim();

        String cropUnderscore = crop.replace(" ", "_");
        String diseaseUnderscore = disease.replace(" ", "_");
        String diseaseNoSpace = disease.replace(" ", "");
        String diseaseNoUnderscore = disease.replace("_", "");
        String diseaseCompact = disease.replace(" ", "").replace("_", "");

        // Full classifier-style labels
        candidates.add(crop + "___" + disease);
        candidates.add(cropUnderscore + "___" + disease);
        candidates.add(crop + "___" + diseaseUnderscore);
        candidates.add(cropUnderscore + "___" + diseaseUnderscore);
        candidates.add(cropUnderscore + "___" + diseaseNoSpace);
        candidates.add(cropUnderscore + "___" + diseaseCompact);

        // Disease-only fallbacks
        candidates.add(disease);
        candidates.add(diseaseUnderscore);
        candidates.add(diseaseNoSpace);
        candidates.add(diseaseNoUnderscore);
        candidates.add(diseaseCompact);

        List<String> unique = new ArrayList<>();
        for (String c : candidates) {
            if (c != null && !c.isBlank() && !unique.contains(c)) {
                unique.add(c);
            }
        }
        return unique;
    }

    private String normalizeLoose(String value) {
        return value == null ? "" : value.toLowerCase().replace(" ", "").replace("_", "").replace("-", "");
    }

    private String buildPrompt(String cropName, String diseaseName, Double confidence, String knowledge) {
        String confidenceText = confidence != null
                ? String.format("%.0f%%", confidence * 100)
                : "N/A";

        String confidenceNote = "";
        if (confidence != null && confidence < 0.7) {
            confidenceNote = """

                    IMPORTANT:
                    - Confidence is low.
                    - Clearly mention uncertainty.
                    - Recommend verification by a local agricultural officer or expert.
                    """;
        }

        String diseaseKnowledge = knowledge.isBlank()
                ? "No specific disease knowledge available."
                : knowledge;

        return """
                You are an agricultural advisor for farmers in Bangladesh.

                Crop: %s
                Predicted Disease: %s
                Confidence: %s%s

                DISEASE KNOWLEDGE:
                %s

                RULES:
                - Use the predicted disease as the main diagnosis.
                - Do not invent another disease.
                - Base advice mainly on the disease knowledge above.
                - Keep advice simple, practical, and farmer-friendly.
                - Do not give exact chemical dosages unless explicitly stated in the knowledge.
                - If knowledge is missing, give cautious general advice only.
                - Bangla must be a faithful translation of English.
                - Do not add extra information in Bangla.

                Return only this JSON:
                {
                  "english": {
                    "summary": "",
                    "immediate_actions": [],
                    "prevention": [],
                    "why_this_happens": [],
                    "when_to_escalate": ""
                  },
                  "bangla": {
                    "summary": "",
                    "immediate_actions": [],
                    "prevention": [],
                    "why_this_happens": [],
                    "when_to_escalate": ""
                  }
                }

                /no_think
                """.formatted(
                cropName,
                diseaseName,
                confidenceText,
                confidenceNote,
                diseaseKnowledge
        );
    }

    /**
     * Uses Ollama defaults like the Ollama app:
     * - no forced num_ctx
     * - no forced temperature
     */
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
            long loadNs = root.path("load_duration").asLong(0);
            long promptEvalNs = root.path("prompt_eval_duration").asLong(0);
            long evalNs = root.path("eval_duration").asLong(0);
            int promptTokens = root.path("prompt_eval_count").asInt(0);
            int evalTokens = root.path("eval_count").asInt(0);

            log.info(
                    "Ollama timing: total={} ms, load={} ms, prompt_eval={} ms, eval={} ms, prompt_tokens={}, eval_tokens={}",
                    totalNs / 1_000_000,
                    loadNs / 1_000_000,
                    promptEvalNs / 1_000_000,
                    evalNs / 1_000_000,
                    promptTokens,
                    evalTokens
            );

            String text = root.path("response").asText("");
            text = text.replaceAll("(?s)<think>.*?</think>", "").strip();
            return text;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Ollama response: " + e.getMessage(), e);
        }
    }

    AdviceResponse parseAdviceResponse(String raw) {
        String cleaned = raw == null ? "" : raw.strip();

        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceFirst("```[a-zA-Z]*\\s*", "");
            if (cleaned.endsWith("```")) {
                cleaned = cleaned.substring(0, cleaned.lastIndexOf("```"));
            }
            cleaned = cleaned.strip();
        }

        int braceStart = cleaned.indexOf('{');
        int braceEnd = cleaned.lastIndexOf('}');
        if (braceStart >= 0 && braceEnd > braceStart) {
            cleaned = cleaned.substring(braceStart, braceEnd + 1);
        }

        try {
            JsonNode root = objectMapper.readTree(cleaned);

            JsonNode english = root.path("english");
            JsonNode bangla = root.path("bangla");

            return AdviceResponse.builder()
                    .summary(english.path("summary").asText("No summary available."))
                    .immediateActions(jsonArrayToList(english.path("immediate_actions")))
                    .prevention(jsonArrayToList(english.path("prevention")))
                    .whyThisHappens(jsonArrayToList(english.path("why_this_happens")))
                    .whenToEscalate(
                            english.path("when_to_escalate")
                                    .asText("Consult a local agricultural officer if symptoms persist or worsen.")
                    )
                    .summaryBn(blankToNull(bangla.path("summary").asText(null)))
                    .immediateActionsBn(jsonArrayToListNullable(bangla.path("immediate_actions")))
                    .preventionBn(jsonArrayToListNullable(bangla.path("prevention")))
                    .whyThisHappensBn(jsonArrayToListNullable(bangla.path("why_this_happens")))
                    .whenToEscalateBn(blankToNull(bangla.path("when_to_escalate").asText(null)))
                    .build();

        } catch (Exception e) {
            log.warn("Failed to parse Ollama JSON response, using fallback parsing. Error: {}", e.getMessage());

            return AdviceResponse.builder()
                    .summary(cleaned.length() > 500 ? cleaned.substring(0, 500) + "..." : cleaned)
                    .immediateActions(List.of("Please consult a local agricultural officer for specific guidance."))
                    .prevention(List.of("Follow general crop hygiene practices."))
                    .whyThisHappens(List.of("See the summary above for details."))
                    .whenToEscalate("If symptoms worsen or spread rapidly, contact your nearest agricultural officer.")
                    .summaryBn(null)
                    .immediateActionsBn(null)
                    .preventionBn(null)
                    .whyThisHappensBn(null)
                    .whenToEscalateBn(null)
                    .build();
        }
    }

    private List<String> jsonArrayToList(JsonNode node) {
        List<String> result = new ArrayList<>();
        if (node != null && node.isArray()) {
            for (JsonNode item : node) {
                String text = item.asText("").strip();
                if (!text.isBlank()) {
                    result.add(text);
                }
            }
        }
        if (result.isEmpty()) {
            result.add("Consult a local agricultural expert for detailed guidance.");
        }
        return result;
    }

    private List<String> jsonArrayToListNullable(JsonNode node) {
        List<String> result = new ArrayList<>();
        if (node != null && node.isArray()) {
            for (JsonNode item : node) {
                String text = item.asText("").strip();
                if (!text.isBlank()) {
                    result.add(text);
                }
            }
        }
        return result.isEmpty() ? null : result;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    private AdviceResponse fallbackAdvice(String cropName, String diseaseName, Double confidence) {
        String confText = confidence != null ? String.format(" (confidence: %.0f%%)", confidence * 100) : "";

        return AdviceResponse.builder()
                .summary("The AI advice system is temporarily unavailable. The prediction indicates "
                        + diseaseName + " on " + cropName + confText
                        + ". Please review the details with a local agricultural officer.")
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
                .summaryBn("এআই পরামর্শ ব্যবস্থা সাময়িকভাবে অনুপলব্ধ। নিকটস্থ কৃষি কর্মকর্তার সাথে যোগাযোগ করুন।")
                .immediateActionsBn(List.of(
                        "আক্রান্ত গাছগুলো ভালোভাবে পর্যবেক্ষণ করুন।",
                        "সম্ভাব্য সংক্রমণ সুস্থ গাছে ছড়ানো এড়িয়ে চলুন।",
                        "স্থানীয় কৃষি কর্মকর্তার সঙ্গে যোগাযোগ করুন।"
                ))
                .preventionBn(List.of(
                        "সাধারণ ফসল পরিচ্ছন্নতা বজায় রাখুন।",
                        "সম্ভব হলে রোগ-সহনশীল জাত ব্যবহার করুন।"
                ))
                .whyThisHappensBn(List.of(
                        "এই মুহূর্তে বিস্তারিত বিশ্লেষণ পাওয়া যাচ্ছে না। পূর্বাভাস ব্যবস্থা কিছু উপসর্গ শনাক্ত করেছে।"
                ))
                .whenToEscalateBn("পেশাদার রোগ নির্ণয় ও চিকিৎসা পরামর্শের জন্য নিকটস্থ কৃষি অফিসে যোগাযোগ করুন।")
                .build();
    }
}