package com.example.agriverse.config;

import com.example.agriverse.model.*;
import com.example.agriverse.repository.IssueRepository;
import com.example.agriverse.repository.RoleRepository;
import com.example.agriverse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;

/**
 * Seeds the database with realistic test data:
 * - 8 farmer users from different Bangladesh locations
 * - 6 additional govt officers across Bangladesh
 * - ~55 crop disease issues spread with geographic clustering
 * - Images copied from Basic_dataset into uploads/
 */
@Component
@Order(2) // run after RoleConfig (default order) and AdminConfig
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepo;
    private final RoleRepository roleRepo;
    private final IssueRepository issueRepo;
    private final PasswordEncoder passwordEncoder;

    private static final Path DATASET_ROOT = Paths.get("../Basic_dataset");
    private static final Path UPLOAD_DIR = Paths.get("uploads");

    private final Random rng = new Random(42); // fixed seed for reproducibility

    @Override
    public void run(String... args) throws Exception {
        // Skip if data already seeded (check for any farmer user)
        if (userRepo.existsByUsername("farmer_bogra")) {
            System.out.println("ℹ️  Seed data already exists, skipping.");
            return;
        }

        Role userRole = roleRepo.findByName("ROLE_USER")
                .orElseThrow(() -> new RuntimeException("ROLE_USER not found — RoleConfig must run first"));
        Role officerRole = roleRepo.findByName("ROLE_GOVT_OFFICER")
                .orElseThrow(() -> new RuntimeException("ROLE_GOVT_OFFICER not found"));

        Files.createDirectories(UPLOAD_DIR);

        List<User> farmers = seedFarmers(userRole);
        List<User> officers = seedOfficers(officerRole);
        seedIssues(farmers, officers);

        System.out.println("✅ Seed data created: " + farmers.size() + " farmers, "
                + officers.size() + " new officers, ~55 issues with images");
    }

    // ── Farmers ─────────────────────────────────────────────────────────

    private List<User> seedFarmers(Role userRole) {
        // Each entry: username, email, lat, lng, locationText
        String[][] farmerData = {
                {"farmer_bogra", "farmer.bogra@mail.com", "24.8465", "89.3773", "Bogra"},
                {"farmer_rajshahi", "farmer.rajshahi@mail.com", "24.3636", "88.6241", "Rajshahi"},
                {"farmer_rangpur", "farmer.rangpur@mail.com", "25.7439", "89.2752", "Rangpur"},
                {"farmer_mymensingh", "farmer.mymensingh@mail.com", "24.7471", "90.4203", "Mymensingh"},
                {"farmer_comilla", "farmer.comilla@mail.com", "23.4607", "91.1809", "Comilla"},
                {"farmer_jessore", "farmer.jessore@mail.com", "23.1634", "89.2182", "Jessore"},
                {"farmer_sylhet", "farmer.sylhet@mail.com", "24.8949", "91.8687", "Sylhet"},
                {"farmer_barisal", "farmer.barisal@mail.com", "22.7010", "90.3535", "Barisal"},
        };

        List<User> farmers = new ArrayList<>();
        for (String[] d : farmerData) {
            if (userRepo.existsByUsername(d[0])) continue;
            User u = new User();
            u.setUsername(d[0]);
            u.setEmail(d[1]);
            u.setPassword(passwordEncoder.encode("farmer123"));
            u.setRoles(Set.of(userRole));
            u.setEmailVerified(true);
            u.setLatitude(Double.parseDouble(d[2]));
            u.setLongitude(Double.parseDouble(d[3]));
            farmers.add(userRepo.save(u));
        }
        return farmers;
    }

    // ── Officers ────────────────────────────────────────────────────────

    private List<User> seedOfficers(Role officerRole) {
        // Additional officers beyond the 2 already in AdminConfig
        String[][] officerData = {
                {"officer_rajshahi", "officer.rajshahi@agriverse.gov", "24.3745", "88.6042", "GOV-RAJ-003"},
                {"officer_rangpur", "officer.rangpur@agriverse.gov", "25.7559", "89.2445", "GOV-RNG-004"},
                {"officer_sylhet", "officer.sylhet@agriverse.gov", "24.8998", "91.8714", "GOV-SYL-005"},
                {"officer_khulna", "officer.khulna@agriverse.gov", "22.8456", "89.5403", "GOV-KHL-006"},
                {"officer_barisal", "officer.barisal@agriverse.gov", "22.7010", "90.3535", "GOV-BAR-007"},
                {"officer_mymensingh", "officer.mymensingh@agriverse.gov", "24.7571", "90.4203", "GOV-MYM-008"},
        };

        List<User> officers = new ArrayList<>();
        for (String[] d : officerData) {
            if (userRepo.existsByUsername(d[0])) continue;
            User u = new User();
            u.setUsername(d[0]);
            u.setEmail(d[1]);
            u.setPassword(passwordEncoder.encode("officer123"));
            u.setRoles(Set.of(officerRole));
            u.setEmailVerified(true);
            u.setLatitude(Double.parseDouble(d[2]));
            u.setLongitude(Double.parseDouble(d[3]));
            u.setIdentificationNumber(d[4]);
            officers.add(userRepo.save(u));
        }
        return officers;
    }

    // ── Issues ──────────────────────────────────────────────────────────

    private void seedIssues(List<User> farmers, List<User> officers) throws IOException {
        // Combine new officers with existing ones for assignment
        List<User> allOfficers = new ArrayList<>(officers);
        userRepo.findByUsername("officer_dhaka").ifPresent(allOfficers::add);
        userRepo.findByUsername("officer_chittagong").ifPresent(allOfficers::add);

        // Disease definitions: folder name in Basic_dataset -> display name, crop
        String[][] diseases = {
                {"Bacterialblight", "Bacterial Blight", "Rice"},
                {"Blast", "Blast", "Rice"},
                {"Brownspot", "Brown Spot", "Rice"},
                {"Tungro", "Tungro", "Rice"},
                {"Potato___Early_blight", "Early Blight", "Potato"},
                {"Potato___Late_blight", "Late Blight", "Potato"},
                {"Tomato___Bacterial_spot", "Bacterial Spot", "Tomato"},
                {"Tomato___Early_blight", "Early Blight", "Tomato"},
                {"Tomato___Late_blight", "Late Blight", "Tomato"},
                {"Tomato___Leaf_Mold", "Leaf Mold", "Tomato"},
                {"Tomato___Septoria_leaf_spot", "Septoria Leaf Spot", "Tomato"},
                {"Tomato___Target_Spot", "Target Spot", "Tomato"},
                {"Tomato___Tomato_Yellow_Leaf_Curl_Virus", "Yellow Leaf Curl Virus", "Tomato"},
        };

        // Geographic clusters: center lat, center lng, region name, radius (degrees)
        double[][] clusters = {
                {24.80, 89.35, 0.15},  // Bogra area — rice belt
                {24.37, 88.60, 0.12},  // Rajshahi — rice + potato
                {25.74, 89.28, 0.18},  // Rangpur — potato belt
                {24.75, 90.42, 0.10},  // Mymensingh — mixed
                {23.46, 91.18, 0.08},  // Comilla — mixed
                {23.16, 89.22, 0.10},  // Jessore — vegetables/tomato
                {22.70, 90.35, 0.12},  // Barisal — rice
                {23.81, 90.41, 0.06},  // Dhaka periphery
        };

        String[] clusterNames = {
                "Bogra", "Rajshahi", "Rangpur", "Mymensingh",
                "Comilla", "Jessore", "Barisal", "Dhaka"
        };

        // Issue generation plan: ~55 issues with clustering
        // Rice diseases cluster in Bogra, Rajshahi, Barisal, Mymensingh
        // Potato diseases cluster in Rangpur, Rajshahi
        // Tomato diseases cluster in Jessore, Comilla, Dhaka
        int[][] issueDistribution = {
                // {diseaseIndex, clusterIndex, count}
                {0, 0, 4},  // Bacterial Blight in Bogra
                {0, 6, 3},  // Bacterial Blight in Barisal
                {1, 0, 3},  // Blast in Bogra
                {1, 1, 2},  // Blast in Rajshahi
                {2, 3, 3},  // Brown Spot in Mymensingh
                {2, 6, 2},  // Brown Spot in Barisal
                {3, 0, 2},  // Tungro in Bogra
                {3, 1, 2},  // Tungro in Rajshahi
                {4, 2, 4},  // Potato Early Blight in Rangpur
                {4, 1, 2},  // Potato Early Blight in Rajshahi
                {5, 2, 3},  // Potato Late Blight in Rangpur
                {5, 1, 2},  // Potato Late Blight in Rajshahi
                {6, 5, 3},  // Tomato Bacterial Spot in Jessore
                {7, 5, 2},  // Tomato Early Blight in Jessore
                {7, 4, 2},  // Tomato Early Blight in Comilla
                {8, 7, 2},  // Tomato Late Blight in Dhaka
                {8, 4, 2},  // Tomato Late Blight in Comilla
                {9, 5, 2},  // Tomato Leaf Mold in Jessore
                {10, 7, 2}, // Septoria Leaf Spot in Dhaka
                {11, 4, 2}, // Target Spot in Comilla
                {12, 5, 3}, // Yellow Leaf Curl Virus in Jessore
                {12, 7, 2}, // Yellow Leaf Curl Virus in Dhaka
        };

        IssueStatus[] statuses = {
                IssueStatus.NEW, IssueStatus.NEW, IssueStatus.NEW,
                IssueStatus.UNDER_REVIEW, IssueStatus.UNDER_REVIEW,
                IssueStatus.GROUPED_IN_CHAT,
                IssueStatus.RESOLVED
        };

        int issueCount = 0;
        for (int[] plan : issueDistribution) {
            int diseaseIdx = plan[0];
            int clusterIdx = plan[1];
            int count = plan[2];

            String folder = diseases[diseaseIdx][0];
            String diseaseName = diseases[diseaseIdx][1];
            String cropName = diseases[diseaseIdx][2];

            double centerLat = clusters[clusterIdx][0];
            double centerLng = clusters[clusterIdx][1];
            double radius = clusters[clusterIdx][2];
            String regionName = clusterNames[clusterIdx];

            // Get available images from dataset folder
            List<Path> datasetImages = getDatasetImages(folder);

            for (int i = 0; i < count; i++) {
                // Scatter within cluster radius
                double lat = centerLat + (rng.nextDouble() * 2 - 1) * radius;
                double lng = centerLng + (rng.nextDouble() * 2 - 1) * radius;

                // Pick a random farmer (prefer farmers near this cluster)
                User farmer = pickNearestFarmer(farmers, lat, lng);

                // Copy 1-2 images from dataset to uploads/
                List<String> imageUrls = copyDatasetImages(datasetImages, 1 + rng.nextInt(2));

                // Random status (weighted towards NEW/UNDER_REVIEW)
                IssueStatus status = statuses[rng.nextInt(statuses.length)];

                // Some issues get assigned to an officer
                User assignedOfficer = null;
                if (status != IssueStatus.NEW) {
                    assignedOfficer = pickNearestOfficer(allOfficers, lat, lng);
                }

                // Confidence between 0.65 and 0.98
                double confidence = 0.65 + rng.nextDouble() * 0.33;
                confidence = Math.round(confidence * 100.0) / 100.0;

                String note = generateNote(diseaseName, cropName, regionName, i);

                Issue issue = Issue.builder()
                        .farmer(farmer)
                        .predictedDisease(diseaseName)
                        .cropName(cropName)
                        .confidence(confidence)
                        .diagnosisSource(DiagnosisSource.ML)
                        .status(status)
                        .assignedOfficer(assignedOfficer)
                        .note(note)
                        .latitude(lat)
                        .longitude(lng)
                        .locationText(regionName + " area, Bangladesh")
                        .imageUrls(new ArrayList<>(imageUrls))
                        .build();

                issueRepo.save(issue);
                issueCount++;
            }
        }

        System.out.println("   Created " + issueCount + " issues across " + clusterNames.length + " regions");
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    private List<Path> getDatasetImages(String folder) throws IOException {
        Path dir = DATASET_ROOT.resolve(folder);
        if (!Files.isDirectory(dir)) {
            System.out.println("   ⚠ Dataset folder not found: " + dir);
            return List.of();
        }
        List<Path> images = new ArrayList<>();
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(dir, "*.{jpg,JPG,jpeg,JPEG,png,PNG}")) {
            for (Path p : stream) {
                images.add(p);
            }
        }
        return images;
    }

    private List<String> copyDatasetImages(List<Path> datasetImages, int count) throws IOException {
        List<String> urls = new ArrayList<>();
        if (datasetImages.isEmpty()) return urls;

        for (int i = 0; i < count && !datasetImages.isEmpty(); i++) {
            Path src = datasetImages.get(rng.nextInt(datasetImages.size()));
            String ext = ".jpg";
            String name = src.getFileName().toString();
            int dot = name.lastIndexOf('.');
            if (dot >= 0) ext = name.substring(dot);

            String uuid = UUID.randomUUID() + ext;
            Path dest = UPLOAD_DIR.resolve(uuid);
            Files.copy(src, dest, StandardCopyOption.REPLACE_EXISTING);
            urls.add("/api/files/" + uuid);
        }
        return urls;
    }

    private User pickNearestFarmer(List<User> farmers, double lat, double lng) {
        User nearest = farmers.get(0);
        double minDist = Double.MAX_VALUE;
        for (User f : farmers) {
            if (f.getLatitude() == null || f.getLongitude() == null) continue;
            double d = haversine(lat, lng, f.getLatitude(), f.getLongitude());
            if (d < minDist) {
                minDist = d;
                nearest = f;
            }
        }
        return nearest;
    }

    private User pickNearestOfficer(List<User> officers, double lat, double lng) {
        if (officers.isEmpty()) return null;
        User nearest = officers.get(0);
        double minDist = Double.MAX_VALUE;
        for (User o : officers) {
            if (o.getLatitude() == null || o.getLongitude() == null) continue;
            double d = haversine(lat, lng, o.getLatitude(), o.getLongitude());
            if (d < minDist) {
                minDist = d;
                nearest = o;
            }
        }
        return nearest;
    }

    private double haversine(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private String generateNote(String disease, String crop, String region, int idx) {
        String[] templates = {
                "Found " + disease.toLowerCase() + " symptoms on " + crop.toLowerCase() + " plants in my field near " + region + ".",
                "Several " + crop.toLowerCase() + " plants showing signs of " + disease.toLowerCase() + " in " + region + " area.",
                "Noticed " + disease.toLowerCase() + " infection spreading in " + crop.toLowerCase() + " crop near " + region + ".",
                crop + " crop affected by " + disease.toLowerCase() + ", need assistance. Location: " + region + ".",
                "Multiple " + crop.toLowerCase() + " plants in " + region + " area showing " + disease.toLowerCase() + " symptoms.",
                "Urgent: " + disease + " detected on " + crop.toLowerCase() + " field in " + region + ".",
        };
        int t = (idx + disease.hashCode()) & 0x7FFFFFFF;
        return templates[t % templates.length];
    }
}
