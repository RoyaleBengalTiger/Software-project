package com.example.agriverse;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class AgriVerseApplication {

    public static void main(String[] args) {
        SpringApplication.run(AgriVerseApplication.class, args);
    }

}
