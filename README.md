# 🎤 InterviewAI

**InterviewAI** is an AI-powered, voice-interactive interview platform designed for both **companies** and **individuals**. It combines **speech-to-text (STT)**, **text-to-speech (TTS)**, and **LLM-based evaluation** to provide realistic, automated interview experiences.

---

## 🎥 Demo
(Better Video Quality Demo here: https://youtu.be/ZOayc6ic7FE)

https://github.com/user-attachments/assets/93805eda-f69b-47f5-93c3-dfb93e1c7f0b

---

## 🏢 For Companies

Companies can use Interview Simulator to **streamline candidate screening** and standardize early interview rounds.  

- 📋 **Custom interview creation**  
  - Define question sets across multiple tiers (difficulty levels).  
  - Attach **ideal answers** to guide AI evaluation.  
  - Configure how many questions to include per tier.  

- 🔗 **Candidate invitations**  
  - Generate **unique, one-time interview links** for candidates.  
  - Send invitations automatically via integrated email service.  

- 🎙️ **Voice-based candidate experience**  
  - Candidates hear questions via **text-to-speech (TTS)**.  
  - They respond by speaking, and answers are transcribed via **speech-to-text (STT)**.  

- 📊 **Evaluation & results**  
  - AI compares responses with ideal answers and generates a structured evaluation.  
  - Results include **detailed feedback, scoring, and highlights of strengths/weaknesses**.  
  - Evaluations are accessible only to the company (not the candidate).  

- 🗂️ **Company dashboard**  
  - Manage interviews and view detailed results for each candidate.  
  - Save promising candidates to a dedicated **Saved Candidates** list.  
  - Review **interview sessions** and **response transcripts** in the dashboard.  


---

## 👤 For Individual Users

Individuals can use the platform to **prepare for job interviews** through realistic, AI-powered mock sessions.  

- 🎯 **Domain selection**  
  - Choose a focus area (e.g., React, Data Science, LLMs).  
  - The system dynamically selects **two random questions per difficulty tier (E → A by default)**.  

- 🎙️ **Voice-interactive mock interview**  
  - Questions are asked via **text-to-speech (TTS)**.  
  - Users answer by voice; responses are transcribed via **speech-to-text (STT)**.  

- 📖 **Guided learning with sample answers**  
  - Each question comes with a sample **ideal answer**.  
  - AI uses this context to evaluate the user’s response more fairly and accurately.  

- 📊 **Detailed results & feedback**  
  - After the session, users receive a **complete evaluation report** with scores.  
  - The bilan includes strengths, weaknesses, and personalized improvement tips.  

- 📁 **Personal dashboard**  
  - Track past interviews in the **My Sessions** page.  
  - Review results and monitor progress over time.  

- ⚙️ **Configurable experience**  
  - Adjust how many questions are selected from each difficulty tier.  
  - Customize the practice flow to focus on weaker areas.  

---


## ⚙️ Architecture Overview

- **Frontend (React + Vite)**  
  - Role-based dashboards (User, Company, Admin).  
  - Pages for managing sessions, interviews, candidates, and questions.  
  - Authentication & protected routes with contextual user management.
  - Modern UI styling powered by **Tailwind CSS**.

- **Backend (ASP.NET Core 8)**  
  - REST APIs for user management, interview handling, and reporting.  
  - Integration with PostgreSQL for persistence.  
  - Services for email, file uploads (logos, audio), and activity logging.  
  - Orchestration with Python AI service.  

- **AI Service (Python + FastAPI)**  
  - **Whisper** → Speech-to-Text transcription.  
  - **Kokoro** → Text-to-Speech for dynamic question delivery.  
  - **Groq LLM** → Evaluates candidate/user answers against ideal responses and generates scoring + feedback.  

---
