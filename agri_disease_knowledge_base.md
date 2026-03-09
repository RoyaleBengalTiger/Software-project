# Agriverrse Disease Knowledge Base

This knowledge base is organized from the folder names shown in your screenshot. Based on your note, folders that contain only the disease name are treated as **rice diseases**. Sections labeled **healthy** are included because your classifier predicts those classes too.

## How to use this knowledge base in your app
For each prediction, retrieve the matching section and pass it to your local model along with:
- crop
- predicted class
- confidence
- farmer description
- location
- recent chat context

Recommended output fields for the AI layer:
- summary
- likely impact
- what to check next
- immediate actions
- prevention
- when to escalate
- uncertainty note

---

# 1) Rice — Bacterial Blight (`Bacterialblight`)

## Crop
Rice

## Disease type
Bacterial disease

## Causal organism
*Xanthomonas oryzae* pv. *oryzae*

## Why it matters
Bacterial blight is one of the most destructive rice diseases in Asia and can cause serious yield loss when infection starts early and spreads under favorable conditions.

## Key symptoms
### Seedling stage
- Seedlings may wilt rapidly and dry up; this severe phase is often called **kresek**.
- Leaves can appear gray-green before collapsing.

### Vegetative to reproductive stage
- Lesions usually begin near the **leaf tip or leaf margin**.
- Early lesions are water-soaked, then turn yellow to straw-colored.
- Long blighted streaks extend downward along the leaf blade.
- In humid conditions, bacterial ooze may appear as tiny yellowish beads.
- Severely affected leaves dry out and the canopy can look scorched.

## Disease spread and survival
- The bacterium survives on infected crop residues, volunteer rice, and some weed hosts.
- It can spread through rain splash, irrigation water, wind-driven rain, contaminated tools, and infected planting material.
- Wounds created by storms, leaf clipping, insects, or rough handling favor infection.

## Favorable conditions
- Frequent rain and strong winds
- Flooded or poorly drained fields
- High nitrogen, especially excessive or late nitrogen
- Dense planting and prolonged leaf wetness
- Warm weather typical of rice-growing seasons

## Look-alikes / confusion points
- Nutrient burn and drought scorch can also start from leaf tips, but bacterial blight typically forms expanding blighted streaks and can spread quickly through a field.
- Bacterial leaf streak is usually narrower and more translucent between veins.

## Impact
- Early severe infection can reduce tillering and weaken crop growth.
- Infection during reproductive stages reduces grain filling and overall yield.
- Damage is often worse where susceptible varieties are planted across large areas.

## Immediate field actions
- Mark hotspots and monitor neighboring plants.
- Avoid moving workers or equipment from diseased to healthy wet fields without cleaning.
- Stop unnecessary leaf clipping or rough handling.
- Avoid excess nitrogen topdressing in affected zones.
- Improve water movement and drainage where possible.

## Integrated management
### Resistant varieties
- Prefer locally recommended resistant or tolerant rice varieties whenever available.
- Resistance is one of the most effective management tools for bacterial blight.

### Crop and field hygiene
- Remove volunteer rice and manage grassy weeds that can help the disease persist.
- Plow down or properly decompose infected stubble after harvest.
- Use clean seed and healthy nursery stock.

### Nutrient and water management
- Avoid excessive nitrogen.
- Maintain balanced fertilization, especially potassium where recommended locally.
- Reduce prolonged stagnant conditions when practical.

### Chemical management
- Antibiotic use is generally not a dependable long-term strategy and may not be recommended or legal in many places.
- If a local agricultural authority recommends a bactericide, follow **local label and regulatory guidance only**.

## When to escalate
- Rapid spread after storms or heavy rain
- Large affected patches in nursery or early crop stages
- Repeated outbreaks in the same area
- Field symptoms inconsistent with the classifier result

## Farmer-facing explanation
Bacterial blight usually starts from the leaf tip or edge and moves downward as yellow to straw-colored drying. It spreads faster in wet, windy conditions and where too much nitrogen is used. The best control is resistant variety choice, clean field practice, and avoiding excess nitrogen.

## Backend tags
`rice`, `bacterial`, `leaf-blight`, `water-splash`, `high-risk-after-storm`

## Source anchors
IRRI Rice Knowledge Bank: Bacterial blight; Rice Diseases Online Resource (IRRI); APS Common Names of Plant Diseases—Rice.

---

# 2) Rice — Blast (`Blast`)

## Crop
Rice

## Disease type
Fungal disease

## Causal organism
*Magnaporthe oryzae* (syn. *Pyricularia oryzae*)

## Why it matters
Rice blast is a globally important rice disease because it can attack leaves, collars, nodes, necks, and panicles. Neck blast is especially damaging because it directly reduces grain filling.

## Key symptoms
### Leaf blast
- Classic lesions are **diamond-shaped or spindle-shaped** with gray to whitish centers and brown margins.
- Small dark spots can enlarge quickly under favorable weather.
- Young plants may show many lesions that coalesce and kill leaf area.

### Collar, node, and neck blast
- Lesions at the leaf collar can kill the leaf.
- Node infection weakens stems.
- **Neck blast** causes blackened or rotted necks below the panicle, leading to partially filled or empty grains.

### Panicle symptoms
- Panicles may turn white or dry prematurely.
- Grain filling is poor when neck infection occurs early.

## Disease spread and survival
- The fungus survives on infected seed, crop debris, ratoons, and alternative hosts.
- Spores are produced abundantly and spread by wind and rain.
- New infections can occur rapidly when leaf surfaces remain wet.

## Favorable conditions
- Frequent dew, cloudy weather, and long leaf wetness
- Moderate temperatures
- Dense canopy and poor airflow
- Excess nitrogen and low silicon in some systems
- Drought stress alternating with high humidity can worsen outbreaks

## Look-alikes / confusion points
- Brown spot lesions are usually smaller and more uniformly brown.
- Nutrient deficiencies do not typically form the classic spindle-shaped blast lesions.

## Impact
- Can reduce photosynthesis through leaf damage.
- Neck and panicle infections cause direct yield loss by reducing grain set and grain filling.
- Severe outbreaks can devastate susceptible cultivars.

## Immediate field actions
- Identify whether disease is limited to leaves or has reached the neck/panicle.
- Avoid additional high nitrogen applications.
- Flag severely affected zones for separate follow-up.
- Increase scouting frequency during humid weather.

## Integrated management
### Resistant varieties
- Use locally adapted blast-resistant cultivars whenever available.

### Seed and nursery management
- Use clean seed and avoid carrying over infected nursery material.
- Manage nursery humidity and density.

### Agronomic practices
- Balanced fertilization; avoid excessive nitrogen.
- Good spacing and airflow where transplanting systems allow.
- Proper water and stress management.

### Fungicide management
- Where fungicides are locally recommended, timing matters most around panicle initiation to heading for neck blast protection.
- Always follow local labels and resistance-management guidance.

## When to escalate
- Symptoms appear near booting, heading, or flowering
- Neck blast is visible
- Fast field-wide spread after cloudy, humid weather
- Resistant variety unexpectedly shows severe disease

## Farmer-facing explanation
Rice blast often makes spindle-shaped leaf spots and can become much more serious if it reaches the neck of the panicle. Once neck blast develops, grain filling can fail. The most important controls are resistant varieties, balanced fertilization, and early action before heading.

## Backend tags
`rice`, `fungal`, `blast`, `neck-blast`, `panicle-risk`

## Source anchors
APS lesson: Rice blast; IRRI Rice Diseases Online Resource.

---

# 3) Rice — Brown Spot (`Brownspot`)

## Crop
Rice

## Disease type
Fungal disease

## Causal organism
*Bipolaris oryzae* (syn. *Cochliobolus miyabeanus*)

## Why it matters
Brown spot is often associated with poor crop vigor, nutrient stress, drought stress, or poor soils. It can affect leaves and grains and may reduce seed quality and yield.

## Key symptoms
- Small circular to oval brown lesions on leaves.
- Lesions may have a darker brown margin and lighter center.
- Numerous lesions can merge, causing larger blighted areas.
- On grains, discoloration may appear as dark spotting.
- Seedlings from infected seed may emerge weakly.

## Disease spread and survival
- The fungus can survive on seed and crop residues.
- Spores spread by air and rain splash.
- Infected seed is an important source for new crop infection.

## Favorable conditions
- Nutrient-deficient soils, especially low fertility situations
- Drought stress or intermittent water stress
- Poor seed quality
- Warm humid weather after crop stress

## Look-alikes / confusion points
- Blast lesions are more spindle-shaped and often have gray centers.
- Brown spot tends to be more uniformly brown and associated with low-vigor fields.

## Impact
- Reduced leaf area and photosynthesis
- Lower grain quality and seed quality
- Greater impact in already stressed crops

## Immediate field actions
- Check whether the field also shows signs of nutrient stress.
- Review fertilizer history, especially balanced NPK management.
- Separate seed intended for future planting from heavily affected lots.

## Integrated management
### Seed management
- Use high-quality, disease-free seed.
- Consider seed treatment if locally recommended.

### Soil and plant nutrition
- Improve overall fertility and soil health.
- Correct major nutrient imbalances according to local recommendations.

### Crop hygiene
- Manage residues and volunteers.
- Avoid saving seed from badly affected fields.

### Fungicides
- May be used in some production systems, but correcting crop stress and using healthy seed are foundational.

## When to escalate
- Widespread lesions plus poor field vigor
- Severe grain spotting in seed-production fields
- Brown spot suspected together with other stresses and unclear diagnosis

## Farmer-facing explanation
Brown spot often becomes serious in weak or stressed rice crops. The spots are usually brown and more uniform than blast lesions. Improving seed quality, field fertility, and overall crop vigor is often as important as direct disease control.

## Backend tags
`rice`, `fungal`, `brown-spot`, `stress-associated`, `seed-quality-risk`

## Source anchors
IRRI Rice Diseases Online Resource; APS Common Names of Plant Diseases—Rice.

---

# 4) Potato — Early Blight (`Potato___Early_blight`)

## Crop
Potato

## Disease type
Fungal disease

## Causal organism
*Alternaria solani*

## Why it matters
Early blight is common in potato and can defoliate plants, reduce photosynthesis, and weaken yield, especially when plants are already under nutrient or other stress.

## Key symptoms
- Older leaves are affected first.
- Small dark brown spots enlarge into round lesions with **target-like concentric rings**.
- Tissue around lesions often turns yellow.
- Severe infections cause yellowing, drying, and leaf drop.
- Stems may develop dark, slightly sunken lesions.
- Tubers can develop dark, sunken lesions with corky dry tissue underneath.

## Disease spread and survival
- Survives in crop debris, volunteer potatoes, and infected plant material.
- Spores spread by wind, rain splash, and equipment movement.

## Favorable conditions
- Warm temperatures
- Repeated dew, irrigation splash, or humid nights
- Nutrient stress and aging foliage
- Dense canopy with poor airflow

## Look-alikes
- Late blight lesions are usually less distinctly ringed and often spread faster in cool wet weather.
- Nutrient deficiencies do not produce classic concentric-ring lesions.

## Impact
- Defoliation reduces tuber bulking.
- Repeated seasons of poor control can increase inoculum pressure.

## Immediate field actions
- Confirm whether lesions are ringed and mainly on older foliage.
- Remove heavily diseased volunteer plants near production areas.
- Review irrigation to reduce prolonged leaf wetness.

## Integrated management
### Crop rotation and sanitation
- Rotate away from potato and tomato where possible.
- Destroy volunteer potatoes and infected debris.

### Plant health
- Maintain balanced fertility.
- Reduce plant stress.

### Fungicide programs
- Preventive or early-season fungicide programs are often used in commercial systems when conditions favor disease.
- Follow local resistance-management and label guidance.

## When to escalate
- Rapid increase despite fungicide use
- Tuber lesions present
- Confusion with late blight in cool wet weather

## Farmer-facing explanation
Potato early blight usually starts on older leaves and makes brown spots with ring patterns like a target. It is favored by warm, humid conditions and stressed plants. Good sanitation, balanced nutrition, and timely fungicide protection are the main tools.

## Backend tags
`potato`, `fungal`, `early-blight`, `target-rings`, `older-leaves-first`

## Source anchors
UMN Extension: Early blight in tomato and potato; UMN diagnostic guide for potato leaf spots.

---

# 5) Potato — Healthy (`Potato___healthy`)

## Crop
Potato

## Class meaning
No disease symptoms detected by the classifier in this image.

## Important interpretation rule
A `healthy` prediction means **the uploaded image did not show recognizable symptoms strongly matching the trained disease classes**. It does **not** guarantee the plant is perfectly healthy.

## What to tell users
- No disease pattern was confidently detected in the uploaded leaf image.
- Continue routine scouting.
- Recheck if symptoms appear later on stems, lower leaves, or tubers.
- If the plant is wilting, yellowing, stunted, or showing non-leaf symptoms, additional inspection is still needed.

## Recommended follow-up questions
- Are there stem lesions?
- Are tubers affected?
- Is the whole plant wilting?
- Was there recent frost, heat stress, herbicide exposure, or nutrient problem?

## Preventive advice
- Maintain balanced irrigation and fertility.
- Scout weekly, especially after wet weather.
- Remove volunteers and cull piles.
- Keep records of unusual patches in the field.

## Backend tags
`potato`, `healthy`, `no-obvious-leaf-symptom`, `monitor`

---

# 6) Potato — Late Blight (`Potato___Late_blight`)

## Crop
Potato

## Disease type
Oomycete disease (water mold)

## Causal organism
*Phytophthora infestans*

## Why it matters
Late blight is one of the most destructive diseases of potato and tomato. Under cool, wet conditions it can spread explosively and cause severe crop loss.

## Key symptoms
### Leaves and stems
- Large, irregular, olive-green to brown water-soaked lesions.
- Lesions are not neatly restricted by veins.
- In humid conditions, **white fuzzy sporulation** may appear near lesion edges, especially on leaf undersides.
- Leaves, petioles, and stems can rapidly collapse.

### Tubers
- Irregular sunken brown to purplish lesions around eyes or on the surface.
- Internal reddish-brown granular rot may develop.

## Disease spread and survival
- Sporangia spread by wind and rain over long distances.
- The pathogen survives in infected seed tubers, cull piles, volunteers, and living host tissue.
- Wet conditions strongly favor infection and repeated cycles.

## Favorable conditions
- Cool, wet weather
- Prolonged leaf wetness, fog, dew, and rain
- Dense canopies and poor ventilation

## Look-alikes
- Early blight usually has clearer target-like rings and tends to be more associated with warm weather.
- Frost injury can blacken tissue quickly but does not produce white sporulation.

## Impact
- Rapid field-wide collapse possible
- Tuber infection threatens storage losses
- Requires fast action when confirmed or strongly suspected

## Immediate field actions
- Treat as urgent.
- Separate suspect areas and minimize movement through wet foliage.
- Destroy cull piles and volunteer potatoes if present.
- Do not store visibly infected tubers.

## Integrated management
### Exclusion and sanitation
- Use clean seed tubers.
- Destroy volunteers and cull piles.

### Scouting and rapid response
- Scout frequently during cool, wet periods.
- Confirm quickly if symptoms are suspicious.

### Fungicide programs
- Preventive fungicide programs are critical in regions and seasons with late blight risk.
- Curative expectations are limited once disease is established.
- Follow local recommendations closely.

## When to escalate
- Always escalate suspected late blight quickly.
- Escalate immediately if white sporulation, stem collapse, or tuber symptoms are present.

## Farmer-facing explanation
Late blight is an emergency-type disease in potato. It spreads fastest in cool, wet weather and can destroy foliage quickly. The most urgent actions are quick confirmation, sanitation, and rapid locally recommended fungicide protection if available.

## Backend tags
`potato`, `late-blight`, `high-priority`, `cool-wet-weather`, `storage-risk`

## Source anchors
UMN Extension: Late blight of tomato and potato; UMN potato diagnostic guide.

---

# 7) Tomato — Bacterial Spot (`Tomato___Bacterial_spot`)

## Crop
Tomato

## Disease type
Bacterial disease

## Causal agents
Several *Xanthomonas* species / groups associated with bacterial spot of tomato

## Why it matters
Bacterial spot can damage leaves, stems, and fruit. In favorable warm, wet conditions it spreads quickly and can cause defoliation and fruit spotting.

## Key symptoms
- Small dark water-soaked leaf spots that may become brown to black.
- Spots can be angular to irregular and may be surrounded by yellow halos.
- Lesions often start on lower foliage after rain splash.
- Fruit lesions are small, raised to scabby, and may reduce market value.
- Heavy infection can lead to leaf drop and sunscald on fruit.

## Disease spread and survival
- Can be seedborne and transplant-borne.
- Survives in crop residues and volunteer plants.
- Spread is favored by splashing water, storms, and handling wet plants.

## Favorable conditions
- Warm temperatures
- Frequent rain or overhead irrigation
- Storm injury and wind damage
- Dense foliage and prolonged wetness

## Look-alikes
- Septoria leaf spot usually has many small circular spots with dark margins and tiny black specks in the center.
- Early blight tends to have larger target-like lesions.

## Impact
- Defoliation reduces plant vigor and exposes fruit.
- Fruit lesions reduce marketability.

## Immediate field actions
- Avoid overhead irrigation if possible.
- Avoid working plants while wet.
- Remove severely infected leaves where practical in small-scale systems.
- Separate seed/transplant sources if bacterial spot is suspected.

## Integrated management
### Clean planting material
- Use disease-free seed and transplants.
- Start with clean trays, tools, and nursery areas.

### Cultural control
- Improve spacing and airflow.
- Rotate away from tomato and pepper where possible.
- Manage volunteer solanaceous plants and residues.

### Chemical control
- Copper-based products are commonly used in some systems, often with varying effectiveness and possible resistance issues.
- Follow local labels and resistance guidance.

## When to escalate
- Fruit lesions are appearing widely
- Outbreak follows transplanting or storms
- Nursery/transplant source may be contaminated

## Farmer-facing explanation
Bacterial spot makes small dark leaf spots and can also mark the fruit. It spreads in warm, rainy weather and from splashing water. Clean transplants, reduced leaf wetness, and early disease management are the main controls.

## Backend tags
`tomato`, `bacterial`, `bacterial-spot`, `fruit-spotting`, `warm-wet-risk`

## Source anchors
UMN Extension: Tomato leaf spot diseases; APS tomato disease names.

---

# 8) Tomato — Early Blight (`Tomato___Early_blight`)

## Crop
Tomato

## Disease type
Fungal disease

## Causal organism
*Alternaria solani*

## Key symptoms
- Begins on **older lower leaves**.
- Small dark spots enlarge into brown lesions with **concentric rings**.
- Yellowing around spots is common.
- Stem lesions may occur and can be elongated and dark.
- Fruit near the stem end can develop dark, leathery lesions.

## Favorable conditions
- Warm temperatures
- Humidity, dew, rain splash, overhead irrigation
- Plant stress and older foliage

## Disease spread
- Survives in debris, stakes, volunteers, and related hosts.
- Spread by wind, splash, tools, and workers.

## Impact
- Progressive defoliation
- Fruit sunscald and reduced yield

## Management
- Rotate crops and remove old debris.
- Mulch or reduce soil splash.
- Stake/prune to improve airflow if system allows.
- Water at the base rather than over the canopy where practical.
- Use protectant fungicides where locally recommended.

## When to escalate
- Disease moving rapidly upward through the canopy
- Fruit lesions becoming common
- Unclear distinction from target spot or late blight

## Farmer-facing explanation
Tomato early blight usually starts low on the plant and creates brown spots with ring patterns. Keeping leaves dry, reducing splash, and controlling the disease early is important because once many leaves are lost, fruit quality and yield decline.

## Backend tags
`tomato`, `fungal`, `early-blight`, `lower-leaves-first`, `target-rings`

## Source anchors
UMN Extension: Early blight in tomato and potato; UMN tomato leaf spot diseases.

---

# 9) Tomato — Healthy (`Tomato___healthy`)

## Crop
Tomato

## Class meaning
No disease symptoms detected by the classifier in the uploaded leaf image.

## Interpretation caution
A healthy prediction means there was no clear match to the trained disease classes in that image. It does not rule out:
- early infection not yet visible
- stem or fruit problems
- nutrient deficiency
- herbicide injury
- virus infection with subtle symptoms
- insect or mite issues on unobserved leaves

## Recommended follow-up
- Re-scout lower leaves and the newest growth.
- Check fruit, stems, and the underside of leaves.
- Re-upload an image if symptoms spread.
- Ask about weather, irrigation, pesticide drift, and nearby affected plants.

## Preventive care
- Good airflow
- Consistent irrigation
- Regular scouting after rain
- Clean handling of plants and tools

## Backend tags
`tomato`, `healthy`, `monitor`, `rescout`

---

# 10) Tomato — Late Blight (`Tomato___Late_blight`)

## Crop
Tomato

## Disease type
Oomycete disease (water mold)

## Causal organism
*Phytophthora infestans*

## Why it matters
Tomato late blight can spread very quickly in cool, wet weather and infect leaves, stems, and fruit.

## Key symptoms
- Large, greasy, gray-green to brown lesions that expand rapidly.
- White fuzzy growth may appear on the underside in humid conditions.
- Stems can develop dark lesions and collapse.
- Fruit may develop firm brown lesions.

## Favorable conditions
- Cool, wet, humid weather
- Long leaf wetness periods
- Dense wet canopies

## Disease spread and survival
- Windborne inoculum can move long distances.
- Survives in infected host tissue, potatoes, volunteers, and cull piles.

## Immediate actions
- Treat as urgent.
- Avoid moving through wet infected plants.
- Isolate suspect blocks and monitor nearby potatoes too.

## Management
- Destroy volunteer potatoes and solanaceous bridges.
- Scout rapidly after cool, wet periods.
- Use preventive fungicides where locally recommended.
- Remove severely infected plants in small plots if feasible.

## When to escalate
- Any suspected late blight should be escalated quickly, especially during favorable weather.

## Farmer-facing explanation
Tomato late blight is a fast-moving disease of wet, cool conditions. The combination of rapidly expanding dark lesions and possible white growth on the leaf underside is a major warning sign. Quick local action matters.

## Backend tags
`tomato`, `late-blight`, `urgent`, `cool-wet-risk`

## Source anchors
UMN Extension: Late blight of tomato and potato.

---

# 11) Tomato — Leaf Mold (`Tomato___Leaf_Mold`)

## Crop
Tomato

## Disease type
Fungal disease

## Causal organism
*Passalora fulva* (syn. *Fulvia fulva*, *Cladosporium fulvum*)

## Why it matters
Leaf mold is especially important in humid protected environments such as greenhouses, tunnels, and dense canopies. It mainly affects leaves but can reduce yield through defoliation and poor fruit development.

## Key symptoms
- Old leaves are usually infected first.
- Pale green to yellow spots appear on the **upper leaf surface**.
- Matching **olive-green to brown velvety mold** develops on the underside.
- Affected leaves yellow, then brown, then may drop.
- In severe cases, stems, blossoms, and fruit can also be affected.

## Favorable conditions
- High humidity
- Poor ventilation
- Frequent condensation or prolonged leaf wetness
- Protected cultivation and dense foliage

## Disease spread and survival
- Spores move with air currents, workers, clothing, and tools.
- Survives on residues and in protected structures.

## Look-alikes
- Nutrient chlorosis can yellow leaves but does not create the characteristic olive mold beneath.
- Early blight lesions are more necrotic and ringed.

## Impact
- Progressive defoliation
- Lower photosynthesis and fruit quality loss
- Recurrent greenhouse problem if sanitation is poor

## Management
- Reduce humidity and improve ventilation.
- Space and prune plants to improve airflow.
- Water early in the day and avoid keeping foliage wet overnight.
- Remove infected leaves carefully.
- Use resistant varieties when available.
- Apply fungicides where locally recommended.

## When to escalate
- Rapid spread through greenhouse/tunnel blocks
- Severe disease despite ventilation changes
- Recurrent outbreaks in the same protected structure

## Farmer-facing explanation
Leaf mold usually shows yellow patches on top of older tomato leaves and olive velvety growth underneath. Humidity control is the key. In greenhouses and tunnels, airflow and moisture management are often the most important actions.

## Backend tags
`tomato`, `leaf-mold`, `greenhouse-risk`, `humidity-driven`

## Source anchors
UMN Extension: Tomato leaf mold; Bayer disease guide: Leaf Mold.

---

# 12) Tomato — Septoria Leaf Spot (`Tomato___Septoria_leaf_spot`)

## Crop
Tomato

## Disease type
Fungal disease

## Causal organism
*Septoria lycopersici*

## Why it matters
Septoria leaf spot is one of the most common defoliating diseases of tomato in wet seasons. It often begins on lower leaves and can move upward quickly.

## Key symptoms
- Many small circular spots on older lower leaves.
- Spots often have tan to gray centers with dark brown margins.
- Tiny black specks (**pycnidia**) can often be seen in lesion centers.
- Surrounding tissue may yellow.
- Severe infection causes heavy defoliation from the bottom upward.

## Favorable conditions
- Moderate temperatures
- Frequent rainfall, dew, irrigation splash
- Dense canopy and poor airflow

## Disease spread and survival
- Survives on crop residues, stakes, cages, volunteer plants, and solanaceous weeds.
- Spread by rain splash, irrigation, workers, and tools.

## Look-alikes
- Bacterial spot lesions are darker and more water-soaked early on.
- Early blight lesions are larger and more likely to show concentric rings.

## Impact
- Heavy leaf loss reduces fruit size and exposes fruit to sunscald.

## Management
- Remove lower infected leaves where feasible.
- Mulch to reduce soil splash.
- Rotate away from tomato.
- Clean stakes/cages and destroy residues.
- Use protectant fungicides where recommended.

## When to escalate
- Fast bottom-up defoliation
- Disease moving despite sanitation and fungicide program
- Need to distinguish from bacterial spot or early blight

## Farmer-facing explanation
Septoria makes many small spots and often causes tomato plants to lose lower leaves first. Once defoliation starts, fruit can suffer from sun exposure. Sanitation, splash reduction, and early management are critical.

## Backend tags
`tomato`, `septoria`, `small-many-spots`, `bottom-up-defoliation`

## Source anchors
NC State Extension: Septoria Leaf Spot of Tomato; UMN tomato leaf spot diseases.

---

# 13) Tomato — Spider Mites, Two-Spotted (`Tomato___Spider_mites Two-spotted_spider_mite`)

## Crop
Tomato

## Class type
Arthropod pest, not a plant disease

## Pest name
Two-spotted spider mite (*Tetranychus urticae*)

## Why it matters
This class is important because your model may predict a pest problem rather than an infectious disease. Heavy infestations can reduce vigor, cause leaf bronzing, and worsen under hot, dry conditions.

## Key symptoms
- Fine pale speckling or stippling on leaves
- Bronzing or russeting as feeding continues
- Leaf curling, drying, or drop in heavy infestations
- Fine webbing on undersides or between leaves/stems when populations are high
- Tiny moving dots on leaf undersides; mites are very small and may require magnification

## Favorable conditions
- Hot, dry weather
- Dusty conditions
- Water-stressed plants
- Broad-spectrum insecticide use that disrupts natural enemies

## Spread and biology
- Mites multiply quickly in favorable weather.
- Populations often begin on field edges or stressed plants and then spread.
- They are arachnids, not insects, so insect-only thinking can lead to control mistakes.

## Look-alikes
- Nutrient speckling or spray injury can mimic stippling.
- Some virus symptoms cause mottling, but webbing and visible mites point strongly to spider mites.

## Impact
- Reduced photosynthesis and plant vigor
- Can flare explosively under heat and drought
- May cause significant leaf loss if unmanaged

## Immediate actions
- Inspect the underside of leaves.
- Check for webbing and moving mites.
- Reduce dust and plant stress where possible.
- Avoid unnecessary broad-spectrum insecticides that kill predators.

## Integrated management
### Cultural control
- Reduce dust.
- Maintain even irrigation to reduce plant stress.
- Remove heavily infested leaves in small-scale systems.

### Biological control
- Preserve predatory mites and beneficial insects.
- Avoid disruptive sprays when possible.

### Direct control
- Water sprays, insecticidal soaps, horticultural oils, or locally recommended miticides can be used depending on system and scale.
- Coverage of leaf undersides matters.
- Follow local labels carefully.

## When to escalate
- Heavy webbing or widespread bronzing
- Infestation persists after basic control efforts
- Need for miticide selection in commercial production

## Farmer-facing explanation
Two-spotted spider mites are tiny sap-feeding pests that thrive in hot, dry conditions. They usually cause fine pale speckles first, then bronzing and webbing. Because they are mites, not insects, preserving natural enemies and choosing the right control approach is important.

## Backend tags
`tomato`, `spider-mite`, `arthropod`, `hot-dry-risk`, `webbing`

## Source anchors
UC IPM: Spider Mites; UMN Extension: Twospotted spider mites in home gardens.

---

# 14) Tomato — Target Spot (`Tomato___Target_Spot`)

## Crop
Tomato

## Disease type
Fungal disease

## Causal organism
*Corynespora cassiicola*

## Why it matters
Target spot can affect leaves, stems, and fruit. Under warm humid conditions it can cause rapid tissue collapse and major defoliation.

## Key symptoms
- Small water-soaked spots that become necrotic lesions.
- Lesions enlarge into circular spots with light brown to gray centers and darker margins.
- Concentric zoning can develop, giving a target-like appearance.
- Stem lesions may be elongated.
- Immature and mature fruit can develop dark, sunken lesions; mature fruit lesions may crack.

## Favorable conditions
- Warm temperatures
- High humidity and prolonged wetness
- Dense canopies and protected moisture

## Disease spread and survival
- Spores spread by air movement, rain splash, workers, and tools.
- The pathogen can persist on plant debris and alternate hosts.

## Look-alikes
- Can be confused with early blight and bacterial spot.
- Fruit symptoms may resemble other fruit rots or bacterial lesions.

## Impact
- Defoliation reduces yield and exposes fruit.
- Fruit lesions reduce marketability.
- Severe outbreaks can lead to plant collapse.

## Management
- Improve airflow and reduce leaf wetness.
- Remove and destroy infected crop debris.
- Rotate where practical.
- Scout fruit as well as foliage.
- Use fungicides where recommended locally.

## When to escalate
- Fruit lesions are common
- Disease is spreading fast in humid protected production
- Need distinction from early blight, bacterial spot, or late blight

## Farmer-facing explanation
Target spot can attack leaves, stems, and fruit. The spots can enlarge into circular lesions with darker margins and may resemble other tomato diseases, so fruit inspection and spread pattern are important. Humidity control and early management matter.

## Backend tags
`tomato`, `target-spot`, `fungal`, `fruit-risk`, `humid-risk`

## Source anchors
Bayer disease guide: Target Spot of Tomato.

---

# 15) Tomato — Tomato Mosaic Virus (`Tomato___Tomato_mosaic_virus`)

## Crop
Tomato

## Disease type
Viral disease

## Main viruses relevant to this class
Tomato mosaic virus (ToMV) and closely related tobacco mosaic-type viruses are often discussed together because symptoms and spread patterns overlap.

## Why it matters
Mosaic viruses are persistent, mechanically transmissible, and have no cure once plants are infected. Management depends heavily on prevention and sanitation.

## Key symptoms
- Mottled light and dark green mosaic on leaves
- Leaf distortion, narrowing, or fern-like / shoestring symptoms in some conditions
- Plant stunting
- Fruit discoloration, uneven ripening, or necrotic patterns in some cases
- Symptoms can vary by cultivar, strain, temperature, and mixed infections

## Spread and survival
- Mechanical transmission is very important.
- Virus can spread on hands, tools, stakes, clothing, and plant-to-plant contact.
- Some mosaic viruses persist in plant debris or contaminated materials.

## Favorable conditions for spread
- Frequent handling, pruning, tying, transplanting
- Greenhouse or high-touch production systems
- Infected transplants or contaminated tools

## Look-alikes
- Herbicide injury and nutrient disorders may distort leaves.
- Other tomato viruses can cause overlapping symptoms; lab confirmation is often needed.

## Impact
- Stunting and reduced fruit quality
- Difficult to stop once it spreads through a planting

## Immediate actions
- Isolate suspect plants.
- Wash hands and disinfect tools after contact.
- Avoid handling healthy plants after infected ones.
- Rogue severely affected plants where appropriate.

## Integrated management
- Use resistant varieties where available.
- Start with clean seed/transplants.
- Enforce sanitation for tools, hands, benches, and worker movement.
- Control weeds and alternate hosts around the production area.

## When to escalate
- Multiple plants with mosaic and distortion
- Suspected virus spread in greenhouse or nursery
- Need to distinguish from TYLCV, CMV, herbicide injury, or nutrient stress

## Farmer-facing explanation
Tomato mosaic virus usually causes mottled leaves and leaf distortion. There is no cure after infection, so preventing spread is the main strategy. Clean handling, tool disinfection, and removing badly affected plants are important.

## Backend tags
`tomato`, `virus`, `mosaic`, `mechanical-spread`, `sanitation-critical`

## Source anchors
UMN Extension: Tomato viruses; UC IPM: Tobacco mosaic / tomato.

---

# 16) Tomato — Tomato Yellow Leaf Curl Virus (`Tomato___Tomato_Yellow_Leaf_Curl_Virus`)

## Crop
Tomato

## Disease type
Viral disease

## Virus
Tomato yellow leaf curl virus (TYLCV)

## Main vector
Whiteflies, especially *Bemisia tabaci* complex

## Why it matters
TYLCV can be extremely damaging because plants infected early may become severely stunted and set little marketable fruit.

## Key symptoms
- Upward curling and cupping of leaves
- Yellowing, especially between veins or on leaf margins
- Shortened internodes and stunting
- Reduced flower retention and poor fruit set
- Plants may appear bushy and dwarfed

## Spread and survival
- Spread mainly by viruliferous whiteflies
- Not primarily managed as a mechanically transmitted disease like ToMV
- Can persist in host plants and move with infected transplants and vector populations

## Favorable conditions
- Presence of whiteflies
- Warm climates and protected cultivation
- Continuous tomato production and nearby host plants

## Look-alikes
- Herbicide injury, leaf roll, and some nutrient problems can curl leaves.
- Unlike simple physiological leaf roll, TYLCV usually causes stunting and strong yield effects.

## Impact
- Severe reduction in growth and fruiting when infection occurs early
- Heavy economic losses once established in a production site

## Immediate actions
- Check for whiteflies on the undersides of leaves.
- Remove heavily infected plants if practical and early enough.
- Protect healthy plants from vector buildup.
- Isolate suspect transplants.

## Integrated management
### Vector management
- Monitor and manage whiteflies early.
- Use exclusion methods such as insect screens where possible.
- Apply locally recommended insecticide / IPM programs for whiteflies.

### Planting material and varieties
- Use virus-free transplants.
- Prefer TYLCV-tolerant or resistant cultivars where available.

### Field hygiene
- Remove weeds and alternate hosts that sustain whiteflies or virus reservoirs.
- Synchronize planting and break host continuity where feasible.

## When to escalate
- Whiteflies are abundant
- Many young plants are stunted and curled
- Rapid spread in nursery or greenhouse
- Need help with vector-control program selection

## Farmer-facing explanation
Tomato yellow leaf curl virus is mainly spread by whiteflies. The leaves curl upward, plants become stunted, and fruit set can fall sharply. The key is early whitefly control, clean transplants, and resistant varieties where available.

## Backend tags
`tomato`, `virus`, `tylcv`, `whitefly-vector`, `stunting`, `high-priority`

## Source anchors
NC State Extension: Tomato Yellow Leaf Curl Virus; APS / Phytopathology literature on TYLCV–whitefly interactions.

---

# 17) Rice — Tungro (`Tungro`)

## Crop
Rice

## Disease type
Viral disease complex

## Associated viruses
Rice tungro disease is associated with two viruses: Rice tungro bacilliform virus (RTBV) and Rice tungro spherical virus (RTSV).

## Main vector
Green leafhopper

## Why it matters
Tungro can cause severe stunting and significant yield loss, especially when infection happens early and vector pressure is high.

## Key symptoms
- Yellow to orange-yellow leaf discoloration, often beginning from tips
- Stunting
- Reduced tillering
- Delayed flowering and delayed maturity
- Small panicles, poor panicle exsertion, and higher sterility
- Poorly filled grains and dark brown blotches on grains in severe cases

## Spread and survival
- Spread by green leafhopper vectors
- Virus persists in infected rice and certain alternative hosts, not just residues alone
- Disease build-up depends strongly on vector movement and susceptible crop continuity

## Favorable conditions
- Presence of vector populations
- Continuous rice cropping or overlapping crops
- Susceptible varieties
- Nearby infected fields or volunteer hosts

## Look-alikes
- Nutrient deficiency can yellow leaves but does not usually cause the same combination of severe stunting, delayed flowering, and vector-associated spread.

## Impact
- Severe stunting and reduced tillers
- Poor grain filling and yield loss
- More serious when infection occurs early in crop growth

## Immediate field actions
- Check for green leafhopper presence.
- Mark affected patches and inspect borders.
- Avoid moving infected nursery material.
- Review whether neighboring fields are also affected.

## Integrated management
### Resistant varieties
- Use tungro-resistant or tolerant varieties where locally recommended.

### Vector management
- Manage green leafhopper early using locally recommended IPM measures.
- Coordinate at community level where possible, since vectors move between fields.

### Crop timing and sanitation
- Synchronous planting can reduce disease carryover.
- Remove volunteer hosts and diseased nursery sources.
- Break continuous host availability where feasible.

## When to escalate
- Early infection in nursery or newly transplanted crop
- Clear patch spread with vector presence
- Multiple surrounding fields showing similar symptoms

## Farmer-facing explanation
Tungro is a virus problem spread by green leafhoppers. It causes yellowing, stunting, poor tillering, and poor grain filling. Early vector management and resistant varieties are the main defenses.

## Backend tags
`rice`, `virus`, `tungro`, `green-leafhopper`, `stunting`, `yellowing`

## Source anchors
IRRI Rice Knowledge Bank: Tungro.

---

# 18) Cross-cutting guidance for all classes

## Confidence interpretation
### High confidence
- Good for first-pass advice.
- Still recommend field verification for severe outbreaks.

### Medium confidence
- Give diagnosis plus 1–2 close look-alikes.
- Encourage additional photos and symptom checks.

### Low confidence
- Avoid strong treatment claims.
- Ask for more images and field context.
- Recommend expert review if the crop is economically important.

## Useful follow-up questions for your AI assistant
1. Which part of the plant is affected first: lower leaves, new leaves, stems, fruit, or whole plant?
2. Did symptoms appear after rain, cloudy weather, or hot dry weather?
3. Are nearby plants showing the same pattern?
4. Are insects or whiteflies visible?
5. Was there recent fertilizer stress, pesticide spray, or water stress?
6. Is the crop in greenhouse, tunnel, or open field?
7. Is the farmer seeing webbing, fuzzy growth, bacterial ooze, or ring patterns?

## Escalation rules for your platform
Automatically suggest officer review when:
- late blight is predicted
- viral disease is predicted in nursery or early crop stage
- confidence is low but spread is rapid
- multiple nearby issues share the same severe disease
- fruit/tuber infection is reported
- grower reports major spread after storms

## Suggested JSON structure for retrieval
```json
{
  "class_name": "Tomato___Late_blight",
  "crop": "Tomato",
  "problem_type": "oomycete",
  "causal_agent": "Phytophthora infestans",
  "summary": "Fast-moving destructive blight favored by cool wet weather.",
  "key_symptoms": [
    "large greasy brown lesions",
    "white growth on leaf underside in humid weather",
    "stem collapse",
    "firm brown fruit lesions"
  ],
  "favorable_conditions": [
    "cool weather",
    "high humidity",
    "leaf wetness"
  ],
  "immediate_actions": [
    "treat as urgent",
    "avoid moving through wet plants",
    "separate suspect area"
  ],
  "management": [
    "destroy volunteer hosts",
    "rapid scouting",
    "locally recommended fungicide program"
  ],
  "when_to_escalate": [
    "suspected late blight should be escalated quickly"
  ],
  "look_alikes": [
    "early blight"
  ]
}
```

---

# Source list used to build this knowledge base
- APS: Rice blast lesson
- IRRI Rice Diseases Online Resource
- IRRI Rice Knowledge Bank: Bacterial blight
- IRRI Rice Knowledge Bank: Tungro
- University of Minnesota Extension: Late blight of tomato and potato
- University of Minnesota Extension: Early blight in tomato and potato
- University of Minnesota Extension: Tomato leaf spot diseases
- University of Minnesota Extension: Tomato leaf mold
- University of Minnesota Extension diagnostic guides for tomato and potato disorders
- NC State Extension: Septoria Leaf Spot of Tomato
- NC State Extension: Tomato Yellow Leaf Curl Virus
- University of Minnesota Extension: Tomato viruses
- UC IPM: Tobacco mosaic / tomato
- UC IPM: Spider mites
- University of Minnesota Extension: Twospotted spider mites in home gardens
- Bayer vegetable disease guides: Target Spot of Tomato, Leaf Mold

