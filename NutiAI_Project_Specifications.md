# NutiAI: AI-Powered Diet Assistant - Project Specifications

## 1. Project Information
- **Project Title:** AI-POWERED DIET ASSISTANT (NutiAI)
- **Academic Year:** 2025-2026
- **Institution:** Department of Computer Engineering, Rajiv Gandhi College of Engineering, Savitribai Phule Pune University
- **Project Guide:** Prof. Rahinj P. L.
- **Team Members:**
  1. Aher Dhiraj Ramchandra (Seat No: 72265280B)
  2. Bhise Dhanashri Dnyaneshwar (Seat No: 72265297G)
  3. Adhav Gauri Janardhan (Seat No: 72265305M)
  4. Tejas Bhabad Dattatray (Seat No: 72339517K)

## 2. Abstract
The increasing prevalence of lifestyle-related diseases established an urgent need for effective, user-friendly dietary monitoring tools. Traditional nutrition tracking applications demanded tedious manual entry, precise ingredient measurements, and rigid database lookups, which significantly reduced long-term user engagement and consistency. NutiAI is an intelligent dietary tracking system that leverages Large Language Models (LLMs) to automatically extract exact nutritional content directly from natural conversational text.

## 3. Core Objectives
- To develop an NLP-based system capable of extracting precise macronutrients from conversational text with a response time of under 3 seconds.
- To automatically assign health scores and estimate calories using Large Language Models (Google Gemini API / local Ollama models).
- To create a personalized, interactive AI diet planning agent for real-time coaching.
- To deliver seamless multilingual support (English, Hindi, Spanish) for broader accessibility.
- To ensure highly secure data handling utilizing Node.js, MySQL, and Clerk Authentication.

## 4. Software & Technology Stack
- **Frontend Framework:** React (v18.x) configured with Vite
- **Styling:** Tailwind CSS (premium glassmorphism design, animated mesh backgrounds, micro-animations)
- **Backend Environment:** Node.js (v18+) with Express.js
- **Database:** MySQL (v8.x)
- **Database Management / ORM:** Drizzle ORM
- **Authentication:** Clerk Auth
- **AI Integration:** Google Gemini API (Remote) & Ollama / Gemma (Local fallback)
- **Hosting / Deployment:** Cloud hosting (Vercel/Render for apps, PlanetScale/Aiven for Database)

## 5. Hardware Requirements
### Minimum System Requirements
- **Processor:** Intel i3 or equivalent
- **RAM:** 4 GB
- **Storage:** 20 GB Free Space
- **Network:** Standard Internet Connectivity
- **Browser:** Any modern web browser

### Recommended System Requirements (For Local AI Processing)
- **Processor:** Intel i5/i7 or AMD Ryzen 5 Processor
- **RAM:** 8 GB or higher (16GB+ required for running local LLMs like Ollama)
- **Storage:** 256GB SSD or higher
- **Network:** High-speed Broadband Connection for real-time API processing
- **GPU:** Dedicated GPU for efficient local AI inference

## 6. System Architecture & Modules
The system utilizes a modern full-stack architecture:
1. **Frontend Acquisition (React Client):** Collects unstructured conversational meal descriptions from the user.
2. **Backend API (Node.js Server):** Preprocesses the input, injects the specialized AI system prompt, and securely transmits it to the LLM.
3. **LLM Engine (Gemini / Ollama):** Parses the natural language text into structured JSON data containing exact calories, macronutrients (protein, carbs, fats), and target food items.
4. **Data Persistence (MySQL & Drizzle ORM):** Stores the structured data securely.
5. **Visualization (Dashboard):** Displays updated metrics, gamified health scores, and charts on an interactive UI.

## 7. Key Features
- **Conversational Logging:** Users can just type "I had two scrambled eggs and a piece of toast" and the system automatically calculates precise macros.
- **Multilingual Coaching:** Health coaching and UI localization in English, Hindi, and Spanish.
- **Gamification:** Algorithmic probability scores representing the healthiness of the logged meal.
- **Automated Portion Estimation:** Relies on AI reasoning to deduce average portions if exact weights are not provided.
- **Local AI Fallback:** Graceful fallback to local Ollama models when network-dependent Gemini API is unreachable or rate-limited.

## 8. Data Structures & Entities
**Primary Data Fields:**
- `User ID`: Unique identifier provided by Clerk authentication
- `Input Text`: The raw conversational string provided by the user
- `Food Array`: Target categories and names of the parsed food items
- `Calories`: Model output representing total energy value
- `Health Score`: Algorithmic score representing meal healthiness

## 9. Scope and Limitations
**Scope:** Covers natural language food logging, real-time AI diet coaching, gamification of health scores, and dynamic multilingual localization.
**Limitations:** Does not encompass clinical medical diagnostics, real-time integration with wearable hardware sensors, or IoT device development. Heavily relies on the inherent accuracy of the underlying LLM's nutritional knowledge base.
