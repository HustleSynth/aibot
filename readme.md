# Discord AI Bot - Enterprise Edition

An industry-leading Discord bot with dynamic AI orchestration, quad-tier memory system, and comprehensive analytics. Features OpenRouter integration with DeepSeek and 18+ other AI providers.

## 🌟 Key Features

### AI Providers
- **OpenRouter**: Access to DeepSeek, Llama, Gemma, and more free models
- **Google AI Studio**: Gemini Pro with 60 requests/minute free
- **HuggingFace**: Community models and inference API
- **Groq**: High-speed inference for open models
- **Cohere**: Free tier with 1000 requests/month
- **Mistral AI**: Access to Mistral models
- Plus 12+ more providers with automatic failover

### Memory System
- **Contextual Memory**: Maintains conversation flow (200 entries)
- **Personality Memory**: Adapts to user preferences (200 traits)
- **Individual Memory**: Personal interaction history (200 records)
- **Connections Memory**: Cross-user relationships (200 links)

### Enterprise Features
- 🔄 Dynamic model switching and load balancing
- 📊 Real-time analytics and performance monitoring
- 🛡️ GDPR/CCPA compliant with user privacy controls
- 🚀 Auto-scaling and self-healing architecture
- 🔐 Secure API key management
- 📱 Cross-platform support (Windows, macOS, Linux)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ ([Download](https://nodejs.org/))
- MongoDB ([Local](https://www.mongodb.com/docs/manual/installation/) or [Atlas](https://www.mongodb.com/cloud/atlas))
- Discord Bot Token ([Guide](https://discord.com/developers/docs/getting-started))
- (Optional) API keys for AI providers

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/discord-ai-bot.git
cd discord-ai-bot
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Set up Discord Bot**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Go to Bot section and create a bot
   - Copy the bot token to your `.env` file
   - Enable these Privileged Gateway Intents:
     - Server Members Intent
     - Message Content Intent

5. **Get OpenRouter API Key (Recommended)**
   - Visit [OpenRouter](https://openrouter.ai/)
   - Sign up for a free account
   - Go to [API Keys](https://openrouter.ai/keys)
   - Create a new key and add it to your `.env` file

6. **Start the bot**

**Linux/macOS:**
```bash
./bot.sh start
```

**Windows (PowerShell):**
```powershell
.\bot.ps1 start
```

## 📝 Configuration

### Essential Environment Variables

```env
# Discord (Required)
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here

# OpenRouter (Highly Recommended - for DeepSeek)
OPENROUTER_API_KEY=your_openrouter_key_here

# Database (Default: local MongoDB)
MONGODB_URI=mongodb://localhost:27017/discord-bot
```

### Getting Free API Keys

| Provider | Free Tier | Get API Key |
|----------|-----------|-------------|
| OpenRouter | Pay-as-you-go, many free models | [Get Key](https://openrouter.ai/keys) |
| Google AI | 60 requests/minute | [Get Key](https://makersuite.google.com/app/apikey) |
| HuggingFace | Community models | [Get Key](https://huggingface.co/settings/tokens) |
| Groq | Fast inference | [Get Key](https://console.groq.com/keys) |
| Cohere | 1000 requests/month | [Get Key](https://dashboard.cohere.ai/api-keys) |

## 🎮 Bot Commands

### General Commands
- `/help` - Show all available commands
- `/ping` - Check bot latency
- `/status` - Show bot and system status
- `/model list` - List available AI models
- `/model switch <model>` - Switch to a specific model

### Privacy Commands
- `/optin <feature>` - Enable a feature (memory, analytics, etc.)
- `/optout <feature>` - Disable a feature
- `/data export` - Export your personal data
- `/data delete` - Delete all your data

### Memory Commands
- `/memory status` - Show memory usage
- `/memory preview <tier>` - Preview memory contents
- `/memory clear <tier>` - Clear specific memory tier

### Admin Commands
- `/stats` - Show detailed bot statistics
- `/broadcast <message>` - Send announcement to all servers
- `/debug` - Show debug information

## 🐳 Docker Deployment

```bash
# Using Docker Compose
docker-compose up -d

# Using Docker directly
docker build -t discord-ai-bot .
docker run -d --name discord-bot --env-file .env discord-ai-bot
```

## 🔧 Advanced Usage

### PM2 Deployment (Auto-restart)
```bash
# Linux/macOS
./bot.sh pm2

# Windows
.\bot.ps1 pm2
```

### Development Mode
```bash
# Hot-reload for development
npm run dev
```

### Updating the Bot
```bash
# Linux/macOS
./bot.sh update

# Windows
.\bot.ps1 update
```

## 📊 Monitoring

### View Logs
```bash
# Linux/macOS
./bot.sh logs follow

# Windows
.\bot.ps1 logs follow
```

### Check Status
```bash
# Linux/macOS
./bot.sh status

# Windows
.\bot.ps1 status
```

## 🏗️ Project Structure

```
discord-ai-bot/
├── src/
│   ├── config/          # Configuration files
│   ├── handlers/        # Command and message handlers
│   ├── services/        # Core services
│   │   ├── ai/         # AI orchestration
│   │   ├── database/   # Database management
│   │   ├── memory/     # Memory system
│   │   └── analytics/  # Analytics service
│   ├── utils/          # Utility functions
│   └── index.ts        # Main entry point
├── scripts/            # Utility scripts
├── logs/              # Log files
├── dist/              # Compiled JavaScript
├── .env.example       # Environment template
├── bot.sh            # Linux/macOS startup script
├── bot.ps1           # Windows PowerShell script
├── docker-compose.yml # Docker configuration
├── package.json      # Dependencies
└── tsconfig.json     # TypeScript config
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Troubleshooting

### Bot won't start
- Check your `.env` file has valid Discord token
- Ensure MongoDB is running
- Check logs: `./bot.sh logs` or `.\bot.ps1 logs`

### API providers not working
- Verify API keys in `.env` file
- Check provider status pages
- Some providers may have regional restrictions

### Memory issues
- Increase `MAX_MEMORY_USAGE` in `.env`
- Use PM2 for automatic restarts
- Check for memory leaks in logs

### Permission errors
- Ensure bot has proper Discord permissions
- Check MongoDB connection permissions
- On Linux/macOS, make scripts executable: `chmod +x bot.sh`

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenRouter](https://openrouter.ai/) for providing access to multiple AI models
- [Discord.js](https://discord.js.org/) for the excellent Discord API wrapper
- All the AI providers offering free tiers for developers

## 💬 Support

- Create an issue on GitHub
- Join our [Discord server](#)
- Check the [Wiki](#) for detailed documentation

---

Built with ❤️ by the community. Powered by OpenRouter and cutting-edge AI.