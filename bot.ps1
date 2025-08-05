# Discord Bot Startup Script for Windows
# Supports: start, stop, restart, status, logs, dev, pm2, docker, update, backup

param(
    [Parameter(Position = 0)]
    [string]$Command = "help",
    
    [Parameter(Position = 1)]
    [string]$Option = ""
)

# Bot configuration
$BOT_NAME = "discord-ai-bot"
$BOT_DIR = $PSScriptRoot
$LOG_DIR = Join-Path $BOT_DIR "logs"
$BACKUP_DIR = Join-Path $BOT_DIR "backups"
$PID_FILE = Join-Path $BOT_DIR ".bot.pid"

# Colors
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    Magenta = "Magenta"
    Cyan = "Cyan"
}

# Function to print colored output
function Write-ColorMessage {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Function to print banner
function Show-Banner {
    Clear-Host
    Write-ColorMessage "╔═══════════════════════════════════════════════════════╗" -Color Cyan
    Write-ColorMessage "║        Discord AI Bot - Enterprise Edition            ║" -Color Cyan
    Write-ColorMessage "║              Powered by OpenRouter & AI               ║" -Color Cyan
    Write-ColorMessage "╚═══════════════════════════════════════════════════════╝" -Color Cyan
    Write-Host ""
}

# Check prerequisites
function Test-Prerequisites {
    Write-ColorMessage "Checking prerequisites..." -Color Blue
    
    # Check if .env file exists
    $envFile = Join-Path $BOT_DIR ".env"
    if (-not (Test-Path $envFile)) {
        Write-ColorMessage "Error: .env file not found!" -Color Red
        Write-ColorMessage "Creating .env from .env.example..." -Color Yellow
        
        $envExample = Join-Path $BOT_DIR ".env.example"
        if (Test-Path $envExample) {
            Copy-Item $envExample $envFile
            Write-ColorMessage "Created .env file. Please configure it before starting the bot." -Color Green
        } else {
            Write-ColorMessage "Error: .env.example not found!" -Color Red
        }
        exit 1
    }
    
    # Check Node.js
    try {
        $nodeVersion = node --version 2>$null
        if ($LASTEXITCODE -ne 0) { throw }
    } catch {
        Write-ColorMessage "Error: Node.js is not installed!" -Color Red
        Write-ColorMessage "Please install Node.js 18+ from https://nodejs.org/" -Color Yellow
        exit 1
    }
    
    # Check Node.js version
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($majorVersion -lt 18) {
        Write-ColorMessage "Error: Node.js 18+ is required (found $nodeVersion)" -Color Red
        exit 1
    }
    
    # Check if node_modules exists
    $nodeModules = Join-Path $BOT_DIR "node_modules"
    if (-not (Test-Path $nodeModules)) {
        Write-ColorMessage "Dependencies not installed. Installing..." -Color Yellow
        npm install
    }
    
    # Create directories
    @($LOG_DIR, $BACKUP_DIR) | ForEach-Object {
        if (-not (Test-Path $_)) {
            New-Item -ItemType Directory -Path $_ -Force | Out-Null
        }
    }
    
    Write-ColorMessage "✓ Prerequisites check passed" -Color Green
}

# Function to start the bot
function Start-Bot {
    Show-Banner
    Test-Prerequisites
    
    # Check if already running
    if (Test-Path $PID_FILE) {
        $pid = Get-Content $PID_FILE
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($process) {
            Write-ColorMessage "Bot is already running (PID: $pid)" -Color Yellow
            return
        } else {
            Remove-Item $PID_FILE
        }
    }
    
    Write-ColorMessage "Starting Discord AI Bot..." -Color Blue
    
    # Build TypeScript if needed
    $distDir = Join-Path $BOT_DIR "dist"
    if (-not (Test-Path $distDir) -or ((Get-Item "$BOT_DIR\src").LastWriteTime -gt (Get-Item $distDir).LastWriteTime)) {
        Write-ColorMessage "Building TypeScript..." -Color Yellow
        npm run build
    }
    
    # Start the bot
    $logFile = Join-Path $LOG_DIR "bot.log"
    $indexFile = Join-Path $distDir "index.js"
    
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "node"
    $psi.Arguments = "`"$indexFile`""
    $psi.WorkingDirectory = $BOT_DIR
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi
    
    # Set up event handlers for output
    $outputHandler = {
        if ($EventArgs.Data) {
            Add-Content -Path $logFile -Value $EventArgs.Data
        }
    }
    
    $process.add_OutputDataReceived($outputHandler)
    $process.add_ErrorDataReceived($outputHandler)
    
    $process.Start() | Out-Null
    $process.BeginOutputReadLine()
    $process.BeginErrorReadLine()
    
    $pid = $process.Id
    Set-Content -Path $PID_FILE -Value $pid
    
    Start-Sleep -Seconds 2
    
    $checkProcess = Get-Process -Id $pid -ErrorAction SilentlyContinue
    if ($checkProcess) {
        Write-ColorMessage "✓ Bot started successfully (PID: $pid)" -Color Green
        Write-ColorMessage "View logs: Get-Content -Path '$logFile' -Tail 50 -Wait" -Color Cyan
    } else {
        Write-ColorMessage "✗ Failed to start bot" -Color Red
        Remove-Item $PID_FILE -ErrorAction SilentlyContinue
        Get-Content $logFile -Tail 20
        exit 1
    }
}

# Function to stop the bot
function Stop-Bot {
    if (-not (Test-Path $PID_FILE)) {
        Write-ColorMessage "Bot is not running" -Color Yellow
        return
    }
    
    $pid = Get-Content $PID_FILE
    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
    
    if ($process) {
        Write-ColorMessage "Stopping bot (PID: $pid)..." -Color Blue
        Stop-Process -Id $pid -Force
        Start-Sleep -Seconds 2
        Remove-Item $PID_FILE
        Write-ColorMessage "✓ Bot stopped" -Color Green
    } else {
        Write-ColorMessage "Bot process not found" -Color Yellow
        Remove-Item $PID_FILE
    }
}

# Function to restart the bot
function Restart-Bot {
    Write-ColorMessage "Restarting bot..." -Color Blue
    Stop-Bot
    Start-Sleep -Seconds 2
    Start-Bot
}

# Function to check bot status
function Get-BotStatus {
    Show-Banner
    
    if (Test-Path $PID_FILE) {
        $pid = Get-Content $PID_FILE
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        
        if ($process) {
            Write-ColorMessage "● Bot is running (PID: $pid)" -Color Green
            
            # Show system info
            Write-ColorMessage "`nSystem Information:" -Color Cyan
            $memoryMB = [math]::Round($process.WorkingSet64 / 1MB, 2)
            $virtualMB = [math]::Round($process.VirtualMemorySize64 / 1MB, 2)
            Write-Host "Memory Usage: Virtual: ${virtualMB}MB, Working Set: ${memoryMB}MB"
            Write-Host "CPU Time: $($process.TotalProcessorTime)"
            Write-Host "Start Time: $($process.StartTime)"
            
            # Show recent logs
            Write-ColorMessage "`nRecent Logs:" -Color Cyan
            $logFile = Join-Path $LOG_DIR "bot.log"
            if (Test-Path $logFile) {
                Get-Content $logFile -Tail 5
            }
        } else {
            Write-ColorMessage "● Bot is not running (stale PID file)" -Color Red
            Remove-Item $PID_FILE
        }
    } else {
        Write-ColorMessage "● Bot is not running" -Color Red
    }
}

# Function to show logs
function Show-Logs {
    $logFile = Join-Path $LOG_DIR "bot.log"
    
    if (-not (Test-Path $logFile)) {
        Write-ColorMessage "No logs found" -Color Yellow
        return
    }
    
    switch ($Option) {
        "follow" {
            Write-ColorMessage "Following logs (Ctrl+C to exit)..." -Color Cyan
            Get-Content -Path $logFile -Tail 50 -Wait
        }
        "all" {
            Get-Content -Path $logFile | Out-Host -Paging
        }
        default {
            $lines = if ($Option -match '^\d+$') { [int]$Option } else { 50 }
            Get-Content -Path $logFile -Tail $lines
        }
    }
}

# Function to run in development mode
function Start-DevMode {
    Show-Banner
    Test-Prerequisites
    
    Write-ColorMessage "Starting in development mode..." -Color Blue
    npm run dev
}

# Function to start with PM2
function Start-PM2 {
    # Check if PM2 is installed
    try {
        pm2 --version | Out-Null
    } catch {
        Write-ColorMessage "PM2 not found. Installing..." -Color Yellow
        npm install -g pm2
        npm install -g pm2-windows-startup
        pm2-startup install
    }
    
    Write-ColorMessage "Starting with PM2..." -Color Blue
    
    # Build first
    npm run build
    
    # Create PM2 ecosystem file
    $ecosystemFile = Join-Path $BOT_DIR "ecosystem.config.js"
    @"
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
"@ | Set-Content -Path $ecosystemFile
    
    pm2 start ecosystem.config.js
    pm2 save
    
    Write-ColorMessage "✓ Bot started with PM2" -Color Green
    Write-ColorMessage "Commands: pm2 status | pm2 logs | pm2 restart $BOT_NAME" -Color Cyan
}

# Function to start with Docker
function Start-Docker {
    # Check if Docker is installed
    try {
        docker --version | Out-Null
    } catch {
        Write-ColorMessage "Error: Docker is not installed!" -Color Red
        Write-ColorMessage "Please install Docker Desktop from https://www.docker.com/products/docker-desktop" -Color Yellow
        exit 1
    }
    
    Write-ColorMessage "Starting with Docker..." -Color Blue
    
    $dockerComposeFile = Join-Path $BOT_DIR "docker-compose.yml"
    if (Test-Path $dockerComposeFile) {
        docker-compose up -d
        Write-ColorMessage "✓ Bot started with Docker Compose" -Color Green
        Write-ColorMessage "Commands: docker-compose ps | docker-compose logs -f" -Color Cyan
    } else {
        docker build -t $BOT_NAME .
        docker run -d --name $BOT_NAME --env-file .env $BOT_NAME
        Write-ColorMessage "✓ Bot started with Docker" -Color Green
        Write-ColorMessage "Commands: docker ps | docker logs -f $BOT_NAME" -Color Cyan
    }
}

# Function to update the bot
function Update-Bot {
    Write-ColorMessage "Updating bot..." -Color Blue
    
    # Create backup first
    Backup-Bot
    
    # Pull latest changes if git repo
    $gitDir = Join-Path $BOT_DIR ".git"
    if (Test-Path $gitDir) {
        git pull origin main
    }
    
    # Update dependencies
    npm update
    
    # Rebuild
    npm run build
    
    Write-ColorMessage "✓ Bot updated successfully" -Color Green
    Write-ColorMessage "Please restart the bot for changes to take effect" -Color Yellow
}

# Function to backup the bot
function Backup-Bot {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = Join-Path $BACKUP_DIR "backup_$timestamp.zip"
    
    Write-ColorMessage "Creating backup..." -Color Blue
    
    # Create file list excluding certain directories
    $files = Get-ChildItem -Path $BOT_DIR -Recurse -File |
        Where-Object { 
            $_.FullName -notmatch '(node_modules|dist|logs|backups|\.git)' 
        }
    
    # Create zip file
    Compress-Archive -Path $files.FullName -DestinationPath $backupFile -CompressionLevel Optimal
    
    Write-ColorMessage "✓ Backup created: $backupFile" -Color Green
    
    # Keep only last 5 backups
    Get-ChildItem -Path $BACKUP_DIR -Filter "backup_*.zip" |
        Sort-Object -Property LastWriteTime -Descending |
        Select-Object -Skip 5 |
        Remove-Item -Force
}

# Function to clean logs
function Clear-OldLogs {
    Write-ColorMessage "Cleaning old logs..." -Color Blue
    
    # Archive logs older than 7 days
    Get-ChildItem -Path $LOG_DIR -Filter "*.log" |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } |
        ForEach-Object {
            Compress-Archive -Path $_.FullName -DestinationPath "$($_.FullName).zip" -CompressionLevel Optimal
            Remove-Item $_.FullName
        }
    
    # Delete archives older than 30 days
    Get-ChildItem -Path $LOG_DIR -Filter "*.log.zip" |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
        Remove-Item -Force
    
    Write-ColorMessage "✓ Logs cleaned" -Color Green
}

# Function to show help
function Show-Help {
    Show-Banner
    Write-ColorMessage "Usage: .\bot.ps1 {command} [options]" -Color Cyan
    Write-Host ""
    Write-ColorMessage "Commands:" -Color Yellow
    Write-Host "  start      - Start the bot in production mode"
    Write-Host "  stop       - Stop the bot"
    Write-Host "  restart    - Restart the bot"
    Write-Host "  status     - Check bot status"
    Write-Host "  logs       - Show bot logs (logs follow|all|<lines>)"
    Write-Host "  dev        - Start in development mode with hot reload"
    Write-Host "  pm2        - Start with PM2 process manager"
    Write-Host "  docker     - Start with Docker"
    Write-Host "  update     - Update bot and dependencies"
    Write-Host "  backup     - Create a backup"
    Write-Host "  clean      - Clean old logs"
    Write-Host "  help       - Show this help message"
    Write-Host ""
    Write-ColorMessage "Examples:" -Color Cyan
    Write-Host "  .\bot.ps1 start           # Start the bot"
    Write-Host "  .\bot.ps1 logs follow     # Follow logs in real-time"
    Write-Host "  .\bot.ps1 logs 100        # Show last 100 lines"
    Write-Host "  .\bot.ps1 pm2             # Start with PM2 for auto-restart"
    Write-Host ""
}

# Main script logic
switch ($Command.ToLower()) {
    "start" { Start-Bot }
    "stop" { Stop-Bot }
    "restart" { Restart-Bot }
    "status" { Get-BotStatus }
    "logs" { Show-Logs }
    "dev" { Start-DevMode }
    "pm2" { Start-PM2 }
    "docker" { Start-Docker }
    "update" { Update-Bot }
    "backup" { Backup-Bot }
    "clean" { Clear-OldLogs }
    "help" { Show-Help }
    default { Show-Help }
}