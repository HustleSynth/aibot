# Discord AI Bot - Enterprise Edition

An industry-leading Discord bot with dynamic AI orchestration, quad-tier memory system, and comprehensive analytics.

## 🚀 Features

### Core Features
- **Dynamic AI Orchestration**: Seamlessly switches between 18+ free AI providers
- **Quad-Tier Memory System**: Contextual, Personality, Individual, and Connections memory
- **Dual Database Architecture**: Supabase (real-time) + MongoDB (analytics)
- **Smart Rate Limiting**: Automatic failover and load balancing
- **Privacy-First Design**: Full GDPR/CCPA compliance with user controls
- **Cross-Platform Support**: Windows, macOS, Linux, Docker

### AI Providers (Free Tier)
- **Text Generation**: HuggingFace, Cohere, Google AI Studio, Mistral, OpenRouter, Groq
- **Image Generation**: Stability AI, DeepAI, Replicate
- **Voice/Audio**: ElevenLabs, AssemblyAI, Suno
- **Translation**: Google Translate
- **Analysis**: IBM Watson, Amazon Comprehend, Clarifai

### Memory System
- **Contextual Memory**: Thread/channel conversation history (200 entries)
- **Personality Memory**: User traits and preferences (200 traits)
- **Individual Memory**: Personal interaction history (200 records)
- **Connections Memory**: Cross-user relationships (200 links)

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB (local or Atlas)
- Discord Bot Token
- (Optional) Supabase account
- (Optional) API keys for AI providers

## 🛠️ Installation

### Quick Start (All Platforms)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/discord-ai-bot.git
   cd discord-ai-bot
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start the bot**

   **Linux/macOS:**
   ```bash
   ./bot.sh start    # Production
   ./bot.sh dev      # Development
   ./bot.sh pm2      # PM2 daemon
   ./bot.sh docker   # Docker
   ```

   **Windows (PowerShell):**
   ```powershell
   .\bot.ps1 start    # Production
   .\bot.ps1 dev      # Development
   .\bot.ps1 pm2      # PM2 daemon
   .\bot.ps1 docker   # Docker
   ```

### Docker Installation

```bash
# Using Docker Compose
docker-compose up -d

# Using Docker directly
docker build -t discord-bot .
docker run -d --env-file .env discord-bot
```

## ⚙️ Configuration

### Required Environment Variables

```env
# Discord (Required)
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id

# MongoDB (Required)
MONGODB_URI=mongodb://localhost:27017/discord-bot
```

### Optional AI Providers

Add any of these API keys to enable additional providers:

```env
HUGGINGFACE_API_KEY=      # Text generation
COHERE_API_KEY=           # Text generation
GOOGLE_AI_API_KEY=        # Gemini Pro (180M tokens/month free)
GROQ_API_KEY=             # Fast inference
STABILITY_API_KEY=        # Image generation
DEEPAI_API_KEY=           # Multimodal
REPLICATE_API_KEY=        # Vision/Audio
ELEVENLABS_API_KEY=       # Text-to-speech
ASSEMBLYAI_API_KEY=       # Speech-to-text
```

## 💬 Slash Commands

### User Comman