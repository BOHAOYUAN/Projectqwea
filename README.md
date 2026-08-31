# Sunny Tea House — AI Merchant Operations & Business Intelligence Platform

<p align="center">
  <a href="https://sunny-tea.lumiere-private.com/"><img src="https://img.shields.io/badge/Customer_H5-Live_App-green?style=for-the-badge&logo=vercel" alt="Customer H5" /></a>
  <a href="https://sunny-tea.lumiere-private.com/dashboard"><img src="https://img.shields.io/badge/Merchant_BI_Dashboard-Live_Platform-blue?style=for-the-badge&logo=next.js" alt="Merchant BI" /></a>
  <img src="https://img.shields.io/badge/Next.js_16-App_Router-black?style=for-the-badge&logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Groq_LPU-Llama_3.3_70B-f55036?style=for-the-badge" alt="Groq LPU" />
</p>

> **Sunny Tea House** is a production-ready, full-stack AI review acquisition & multi-tenant business intelligence platform built for global F&B brands entering the North American market.
> 
> Features a dual-end business closed-loop: a mobile-optimized customer review generator (NFC tap-to-review) and a real-time merchant analytics dashboard with Google Places API integration and AI operational copilot.

---

## 🌟 Dual-End Architecture & Features

### 1. Customer-Facing NFC AI Review Generator (`/`)
- **NFC Tap / QR Quick Intake**: 3-second bilingual (English/Chinese) high-conversion review generation.
- **Negative Constraint Guardrails**: Multi-language anti-pollution prompt engineering.
- **Zero-Friction Conversion**: Direct 1-tap copy & redirect to Google Maps / Xiaohongshu.

### 2. Merchant AI Operations & Decision BI Dashboard (`/dashboard`)
- **Google Places API Integration**: One-click binding to synchronize live Google Maps store ratings, reviews, and sentiment.
- **AI Operational Copilot**: Automated root-cause diagnosis for repeat purchases and queuing risks.
- **Batch AI Pipeline**: Auto-generation of structured owner replies and 1-click Excel/CSV reporting.
- **Multi-Tenant Architecture**: Pre-engineered for instant onboarding of multi-location franchise stores across North America.

---

## 🏛️ Tech Stack

- **Framework**: Next.js 16.3.1 (App Router, Turbopack, Serverless API Routes)
- **Language**: TypeScript (Strict Type Safety)
- **Styling**: Tailwind CSS + Lucide Icons + Responsive UI
- **AI Acceleration**: Groq LPU (`llama-3.3-70b-versatile`) + DeepSeek API Fallback
- **Data Visualizations**: Recharts / Canvas 2D / Plotly Analytics

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/BOHAOYUAN/sunny-tea-review.git
cd sunny-tea-review

# Install dependencies
npm install

# Run local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for Customer H5 and [http://localhost:3000/dashboard](http://localhost:3000/dashboard) for Merchant BI.

---

## 📄 License

MIT License.
