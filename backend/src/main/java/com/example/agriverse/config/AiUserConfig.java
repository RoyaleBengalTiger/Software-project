package com.example.agriverse.config;

import com.example.agriverse.model.Role;
import com.example.agriverse.model.User;
import com.example.agriverse.repository.RoleRepository;
import com.example.agriverse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.UUID;

/**
 * Creates a system-level AI user for Ollama chat participation.
 * This user is never used for authentication — it is only
 * referenced as the sender of AI-generated chat messages.
 */
@Slf4j
@Component
@Order(1) // after RoleConfig (0), runs alongside AdminConfig
@RequiredArgsConstructor
public class AiUserConfig implements CommandLineRunner {

    public static final String OLLAMA_USERNAME = "Ollama";
    public static final String OLLAMA_EMAIL = "ollama-ai@agriverse.system";

    private final UserRepository userRepo;
    private final RoleRepository roleRepo;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepo.existsByUsername(OLLAMA_USERNAME)) {
            log.info("Ollama AI system user already exists");
            return;
        }

        Role userRole = roleRepo.findByName("ROLE_USER")
                .orElseThrow(() -> new RuntimeException("ROLE_USER not found"));

        User ollamaUser = new User();
        ollamaUser.setUsername(OLLAMA_USERNAME);
        ollamaUser.setEmail(OLLAMA_EMAIL);
        // Random unguessable password — this account is never used for login
        ollamaUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        ollamaUser.setRoles(Set.of(userRole));
        ollamaUser.setEmailVerified(true);

        userRepo.save(ollamaUser);
        log.info("Created Ollama AI system user");
    }
}
