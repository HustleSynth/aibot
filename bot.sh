#!/bin/bash

# Discord Bot Startup Script
# Supports: start, stop, restart, status, logs, dev, pm2, docker, update, backup

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Bot configuration
BOT_NAME="discord-ai-bot"
BOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$BOT_DIR/logs"
BACKUP_DIR="$BOT_DIR/backups"
PID_FILE="$BOT_DIR/.bot.pid"

# Function to print colored output
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to print banner
print_banner() {
    clear
    print_message $CYAN "╔═══════════════════════════════════════════════════════╗"
    print_message $CYAN "║        Discord AI Bot - Enterprise Edition            ║"
    print_message $CYAN "║              Powered by OpenRouter & AI               ║"
    print_message $CYAN "╚═══════════════════════════════════════════════════════╝"
    echo
}

# Check prerequisites
check_prerequisites() {
    print_message $BLUE "Checking prerequisites..."
    
    # Check if .env file exists
    if [ ! -f "$BOT_DIR/.env" ]; then
        print_message $RED "Error: .env file not found!"
        print_message $YELLOW "Creating .env from .env.example..."
        cp "$BOT_DIR/.env.example" "$BOT_DIR/.env"
        print_message $GREEN "Created .env file. Please configure it before starting the bot."
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_message $RED "Error: Node.js is not installed!"
        print_message $YELLOW "Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_message $RED "Error: Node.js 18+ is required (found v$NODE_VERSION)"
        exit 1
    fi
    
    # Check if node_modules exists
    if [ ! -d "$BOT_DIR/node_modules" ]; then
        print_message $YELLOW "Dependencies not installed. Installing..."
        npm install
    fi
    
    # Create directories
    mkdir -p "$LOG_DIR" "$BACKUP_DIR"
    
    print_message $GREEN "✓ Prerequisites check passed"
}

# Function to start the bot
start_bot() {
    print_banner
    check_prerequisites
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            print_message $YELLOW "Bot is already running (PID: $PID)"
            exit 0
        else
            rm "$PID_FILE"
        fi
    fi
    
    print_message $BLUE "Starting Discord AI Bot..."
    
    # Build TypeScript if needed
    if [ ! -d "$BOT_DIR/dist" ] || [ "$BOT_DIR/src" -nt "$BOT_DIR/dist" ]; then
        print_message $YELLOW "Building TypeScript..."
        npm run build
    fi
    
    # Start the bot
    nohup node "$BOT_DIR/dist/index.js" > "$LOG_DIR/bot.log" 2>&1 &
    PID=$!
    echo $PID > "$PID_FILE"
    
    sleep 2
    
    if ps -p $PID > /dev/null 2>&1; then
        print_message $GREEN "✓ Bot started successfully (PID: $PID)"
        print_message $CYAN "View logs: tail -f $LOG_DIR/bot.log"
    else
        print_message $RED "✗ Failed to start bot"
        rm "$PID_FILE"
        tail -n 20 "$LOG_DIR/bot.log"
        exit 1
    fi
}

# Function to stop the bot
stop_bot() {
    if [ ! -f "$PID_FILE" ]; then
        print_message $YELLOW "Bot is not running"
        return
    fi
    
    PID=$(cat "$PID_FILE")
    if ps -p $PID > /dev/null 2>&1; then
        print_message $BLUE "Stopping bot (PID: $PID)..."
        kill $PID
        sleep 2
        
        if ps -p $PID > /dev/null 2>&1; then
            print_message $YELLOW "Force stopping bot..."
            kill -9 $PID
        fi
        
        rm "$PID_FILE"
        print_message $GREEN "✓ Bot stopped"
    else
        print_message $YELLOW "Bot process not found"
        rm "$PID_FILE"
    fi
}

# Function to restart the bot
restart_bot() {
    print_message $BLUE "Restarting bot..."
    stop_bot
    sleep 2
    start_bot
}

# Function to check bot status
check_status() {
    print_banner
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            print_message $GREEN "● Bot is running (PID: $PID)"
            
            # Show system info
            print_message $CYAN "\nSystem Information:"
            echo "Memory Usage: $(ps -o vsz=,rss= -p $PID | awk '{printf "Virtual: %dMB, RSS: %dMB\n", $1/1024, $2/1024}')"
            echo "CPU Usage: $(ps -o %cpu= -p $PID)%"
            echo "Uptime: $(ps -o etime= -p $PID | xargs)"
            
            # Show recent logs
            print_message $CYAN "\nRecent Logs:"
            tail -n 5 "$LOG_DIR/bot.log"
        else
            print_message $RED "● Bot is not running (stale PID file)"
            rm "$PID_FILE"
        fi
    else
        print_message $RED "● Bot is not running"
    fi
}

# Function to show logs
show_logs() {
    if [ ! -f "$LOG_DIR/bot.log" ]; then
        print_message $YELLOW "No logs found"
        exit 0
    fi
    
    case "${2:-follow}" in
        follow)
            print_message $CYAN "Following logs (Ctrl+C to exit)..."
            tail -f "$LOG_DIR/bot.log"
            ;;
        all)
            less "$LOG_DIR/bot.log"
            ;;
        *)
            tail -n "${2:-50}" "$LOG_DIR/bot.log"
            ;;
    esac
}

# Function to run in development mode
dev_mode() {
    print_banner
    check_prerequisites
    
    print_message $BLUE "Starting in development mode..."
    npm run dev
}

# Function to start with PM2
pm2_start() {
    if ! command -v pm2 &> /dev/null; then
        print_message $YELLOW "PM2 not found. Installing..."
        npm install -g pm2
    fi
    
    print_message $BLUE "Starting with PM2..."
    
    # Build first
    npm run build
    
    # Create PM2 ecosystem file
    cat > "$BOT_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: '$BOT_NAME',
    script: './dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true
  }]
};
EOF
    
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
    
    print_message $GREEN "✓ Bot started with PM2"
    print_message $CYAN "Commands: pm2 status | pm2 logs | pm2 restart $BOT_NAME"
}

# Function to start with Docker
docker_start() {
    if ! command -v docker &> /dev/null; then
        print_message $RED "Error: Docker is not installed!"
        exit 1
    fi
    
    print_message $BLUE "Starting with Docker..."
    
    if [ -f "$BOT_DIR/docker-compose.yml" ]; then
        docker-compose up -d
        print_message $GREEN "✓ Bot started with Docker Compose"
        print_message $CYAN "Commands: docker-compose ps | docker-compose logs -f"
    else
        docker build -t $BOT_NAME .
        docker run -d --name $BOT_NAME --env-file .env $BOT_NAME
        print_message $GREEN "✓ Bot started with Docker"
        print_message $CYAN "Commands: docker ps | docker logs -f $BOT_NAME"
    fi
}

# Function to update the bot
update_bot() {
    print_message $BLUE "Updating bot..."
    
    # Create backup first
    backup_bot
    
    # Pull latest changes
    if [ -d "$BOT_DIR/.git" ]; then
        git pull origin main
    fi
    
    # Update dependencies
    npm update
    
    # Rebuild
    npm run build
    
    print_message $GREEN "✓ Bot updated successfully"
    print_message $YELLOW "Please restart the bot for changes to take effect"
}

# Function to backup the bot
backup_bot() {
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
    
    print_message $BLUE "Creating backup..."
    
    tar -czf "$BACKUP_FILE" \
        --exclude="node_modules" \
        --exclude="dist" \
        --exclude="logs" \
        --exclude="backups" \
        --exclude=".git" \
        -C "$BOT_DIR" .
    
    print_message $GREEN "✓ Backup created: $BACKUP_FILE"
    
    # Keep only last 5 backups
    ls -t "$BACKUP_DIR"/backup_*.tar.gz | tail -n +6 | xargs -r rm
}

# Function to clean logs
clean_logs() {
    print_message $BLUE "Cleaning old logs..."
    
    # Archive logs older than 7 days
    find "$LOG_DIR" -name "*.log" -mtime +7 -exec gzip {} \;
    
    # Delete archives older than 30 days
    find "$LOG_DIR" -name "*.log.gz" -mtime +30 -delete
    
    print_message $GREEN "✓ Logs cleaned"
}

# Function to show help
show_help() {
    print_banner
    print_message $CYAN "Usage: $0 {command} [options]"
    echo
    print_message $YELLOW "Commands:"
    echo "  start      - Start the bot in production mode"
    echo "  stop       - Stop the bot"
    echo "  restart    - Restart the bot"
    echo "  status     - Check bot status"
    echo "  logs       - Show bot logs (logs follow|all|<lines>)"
    echo "  dev        - Start in development mode with hot reload"
    echo "  pm2        - Start with PM2 process manager"
    echo "  docker     - Start with Docker"
    echo "  update     - Update bot and dependencies"
    echo "  backup     - Create a backup"
    echo "  clean      - Clean old logs"
    echo "  help       - Show this help message"
    echo
    print_message $CYAN "Examples:"
    echo "  $0 start           # Start the bot"
    echo "  $0 logs follow     # Follow logs in real-time"
    echo "  $0 logs 100        # Show last 100 lines"
    echo "  $0 pm2             # Start with PM2 for auto-restart"
    echo
}

# Main script logic
case "$1" in
    start)
        start_bot
        ;;
    stop)
        stop_bot
        ;;
    restart)
        restart_bot
        ;;
    status)
        check_status
        ;;
    logs)
        show_logs "$@"
        ;;
    dev)
        dev_mode
        ;;
    pm2)
        pm2_start
        ;;
    docker)
        docker_start
        ;;
    update)
        update_bot
        ;;
    backup)
        backup_bot
        ;;
    clean)
        clean_logs
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac