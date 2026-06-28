# CivicEye AI: Project Description Document

---

## 1. Problem Statement Selected

### Smart City Civic Infrastructure Maintenance & Operations Management
Urban municipal administrations face significant operational friction in maintaining public infrastructure, specifically roads, water lines, streetlights, and sanitation cells. While online grievance submission portals exist, they remain bottlenecked by several systemic failure modes:

* **Manual Triage & Classification**: Civic departments receive thousands of complaints daily. Sorting, identifying categories, and assigning priority rankings requires high manual overhead, causing backlogs.
* **Geospatial Duplicate Congestion**: In public areas, a single infrastructure defect typically triggers redundant submissions from different citizens. Without automatic spatial clustering, these redundant tickets flood the database, clogging engineering queues and wasting field assessment resources.
* **Inaccurate Routing**: Citizens often do not know which specific government body is responsible for an issue (e.g., BBMP vs. BWSSB). Complaints are frequently misrouted, introducing significant inter-departmental delays.
* **Lack of Independent Work Verification**: Once a repair is marked complete by a contractor, municipal officers must manually inspect it, or close the ticket without verification. This lack of objective audit oversight leads to low-quality repairs that fail rapidly.

### Why AI is the Ideal Solution
AI is uniquely suited to automate this administrative lifecycle:
1. **Multimodal Computer Vision** instantly evaluates visual defect evidence, classifies category types, and rates severity levels without manual human triage.
2. **Generative Language Models** draft technical repair checklists, estimate realistic budgets, and compile formal administrative complaints automatically from raw incident reports.
3. **Comparative Vision Algorithms** programmatically audit repairs by analyzing side-by-side "Before" and "After" photos, generating objective quality scores.

---

## 2. Solution Overview

**CivicEye AI** is an AI-powered municipal operations and civic infrastructure management platform designed for Bengaluru, India. It streamlines the complete lifecycle of civic issue reporting—from AI-assisted defect analysis and intelligent complaint generation to municipal routing, operational monitoring, and repair verification.

### End-to-End Workflow

```
[Citizen Uploads Photo] ──> [AI Vision Diagnostics & Interview] ──> [Geospatial Ward & Duplicate Scan]
                                                                                   │
                                                                                   ▼
[Repair Verification Audit] <── [Operations Dashboard Dispatch] <── [Blueprint & Complaint Generation]
```

1. **Defect Capture**: A citizen spots a defect in public (e.g., a broken streetlight or water pipe leak) and uploads a photo using the application.
2. **AI-Powered Vision Ingestion**: The system processes the image using the Gemini API. It immediately classifies the defect category, estimates a visual confidence rating, and determines the initial severity level.
3. **Dynamic Citizen Interview**: The interface dynamically asks the citizen two follow-up questions tailored to the defect category (e.g., asking if a water leak is causing localized flooding, or if it is drinking water vs. sewage).
4. **Geospatial & Ward Resolution**: The application resolves the coordinates, maps them to the nearest Bangalore BBMP Ward, and performs a duplicate check. If another active ticket of the same category is found nearby, the system prompts the citizen to "Support" the existing ticket rather than creating a duplicate.
5. **Technical Blueprinting & Complaint Drafting**: The platform generates a Technical Resolution Blueprint and a formal administrative notice:
   * Selects the correct municipal authority (BBMP, BWSSB, BESCOM, or SWM).
   * Generates a step-by-step technical repair checklist and estimates the required materials, labor numbers, and duration.
   * Calculates a realistic budget estimate in Indian Rupees (₹).
   * Drafts a formal complaint addressed to the corresponding Ward Officer.
6. **Operations Dashboard Dispatch**: The report is logged on the interactive Operations Map. Municipal dispatchers can view aggregated trends, filter tickets by severity, and monitor SLAs.
7. **Comparative Verification**: Once field contractors apply repairs, they upload a resolution photo. The AI-powered verification system compares the "Before" and "After" photos, checking for remaining damage and safety risks, and calculates a repair quality score before authorizing ticket closure.

---

## 3. Key Features

| Feature | Description | Benefit |
| :--- | :--- | :--- |
| **AI Vision Analysis** | Automatically extracts defect types (Pothole, Water Leakage, Garbage Accumulation, Broken Streetlight) and determines severity (Low, Medium, High, Critical) from photos. | Removes the manual triage bottleneck; standardizes incoming data. |
| **BBMP Ward Mapping** | Uses client-side geocoding to resolve coordinate parameters and assign incidents to Wards 1 to 7 in Bengaluru. | Ensures work orders are routed directly to local ward executive engineers. |
| **Geospatial Duplicate Detection** | Performs a geospatial scan near new coordinate submissions to detect existing reports. | Prevents database clutter and duplicate contractor work allocations. |
| **Intelligent Complaint Generation** | Formulates a technical step-by-step checklist, estimates labor, material requirements, resolution budgets (in ₹), and drafts a formal complaint notice. | Automates the procurement request cycle and provides citizens with fully transparent repair checklists. |
| **CivicEye AI Assistant (Powered by Gemini)** | A conversational chatbot that answers municipal questions (SLAs, duplicate detection, ward routing) and guides users step-by-step through filing complaints. | Lowers the barrier to entry for reporting and reduces support staff workloads. |
| **Interactive Dashboard** | Displays city-wide infrastructure indices, active ticket counts, and incident distribution on an interactive map. | Provides dispatchers with real-time operations overview and status controls. |
| **PDF Report Generation** | Compiles the technical blueprint and complaint letter into a downloadable, official PDF document. | Generates official administrative paper trails for municipal files and community records. |
| **Before/After Repair Verification** | Compares pre-repair and post-repair photographs to assess completion percentages, safety risks, and quality scores. | Establishes objective audit standards and ensures contractors complete tasks before receiving payment. |

---

## 4. Technologies Used

| Category | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React, Next.js (App Router) | Handles application logic, page routing, client state management, and server-side page pre-rendering. |
| **Backend** | Serverless API Routes (Next.js) | Handles AI processing, database writes, and PDF compilation on backend endpoints. |
| **AI Engine** | Gemini API (`@google/genai` SDK) | Manages vision diagnostics, interactive interview logic, blueprint cost estimation, chatbot, and repair quality scoring. |
| **Database** | Cloud Firestore, local JSON File | Primary database for real-time synchronization, with a local server-side database file for offline fallback. |
| **Maps** | Leaflet.js, OpenStreetMap | Renders interactive geospatial maps with custom status markers without external API key dependencies. |
| **Styling** | Tailwind CSS, Vanilla CSS | Implements responsive modern layouts, styling tokens, glassmorphism UI elements, and custom scrollbars. |
| **Animations** | Three.js (WebGL Shaders), Framer Motion | Powers the interactive, mouse-responsive particle constellations background on the landing page and smooth page transitions. |
| **Deployment** | Vercel | Hosts the compiled Next.js application, providing fast globally-distributed content delivery. |

---

## 5. Google Technologies Utilized

CivicEye AI integrates the following Google technologies:

### 1. Gemini API (Gemini 2.5 Flash)
* **Vision Diagnostics**: Processes uploaded images to identify civic issue categories, estimate severity, and generate contextual follow-up questions.
* **Resolution Blueprint Generation**: Produces technical repair plans, resource estimates, cost estimation in INR, and formal complaint drafts.
* **CivicEye AI Assistant**: Powers the conversational assistant for civic FAQs, authority guidance, complaint registration, and user assistance.
* **AI-Powered Repair Verification**: Compares before-and-after repair images to evaluate completion quality and generate objective repair assessment scores.

### 2. Google Cloud Firestore
* **Central Database Store**: Serves as the primary operational database storing incident details, coordinates, vision metadata, and dispatch updates.
* **Real-time Synchronization**: Used by client-side dashboard page listeners to retrieve real-time data streams, updating Leaflet map markers instantly when reports change status.

### 3. Firebase Client SDK
* **Connection Orchestrator**: Handles Client-to-Cloud Firestore connection instances, managing reads, updates, and active event listeners safely.
