# AI Voice Agent - Production Deployment Guide

This guide explains how to deploy the AI Voice Agent application using PM2 for backend process management and configure the frontend to be accessible via IP address while communicating with localhost backend.

## 📋 Prerequisites

- Node.js (v18 or higher)
- PM2 (Process Manager)
- Git
- A server with public IP address

## 🚀 Installation Steps

### 1. Install PM2 Globally

```bash
npm install -g pm2
```

### 2. Clone and Setup the Project

```bash
git clone <your-repository-url>
cd aiVoiceAgent
```

### 3. Backend Setup

#### Install Dependencies
```bash
cd backend
npm install
```

#### Build the Backend
```bash
npm run build
```

#### Environment Configuration
Create a `.env` file in the backend directory:

```env
# Backend Configuration
PORT=3001
NODE_ENV=production

# Frontend URL (update with your server IP)
FRONTEND_URL=http://YOUR_SERVER_IP:5173

# API Keys (REQUIRED)
OPENAI_API_KEY=your_openai_api_key_here
API_KEY=your_api_key_here
SERP_API_KEY=your_serp_api_key_here

# Security
JWT_SECRET=your_secure_jwt_secret_here

# Database
DATABASE_PATH=./data/usage.db
JSON_FALLBACK_PATH=./data/usage.json
```

**⚠️ Important:** Replace `YOUR_SERVER_IP` with your actual server IP address.

#### Create PM2 Ecosystem File
Create `ecosystem.config.js` in the backend directory:

```javascript
module.exports = {
  apps: [{
    name: 'ai-voice-agent-backend',
    script: 'dist/server.js',
    cwd: '/home/pritam/aiVoiceAgent/backend',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

#### Create Logs Directory
```bash
mkdir -p logs
```

### 4. Frontend Setup

#### Install Dependencies
```bash
cd ../frontend
npm install
```

#### Update Vite Configuration
Modify `vite.config.js` to allow external access:

```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { 
    port: 5173,
    host: '0.0.0.0', // Allow external access
    strictPort: true
  },
  preview: {
    port: 5173,
    host: '0.0.0.0'
  }
});
```

#### Update API Configuration (Optional)
If you want to make the backend URL configurable, update `frontend/src/services/api.ts`:

```javascript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
```

Then create a `.env` file in the frontend directory:
```env
VITE_BACKEND_URL=http://localhost:3001
```

#### Build the Frontend
```bash
npm run build
```

## 🔧 Deployment Commands

### Start Backend with PM2

```bash
cd backend

# Start the application
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs ai-voice-agent-backend

# Monitor in real-time
pm2 monit
```

### Start Frontend

#### Option 1: Development Server (Recommended for testing)
```bash
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

#### Option 2: Production Build with Preview
```bash
cd frontend
npm run build
npm run preview -- --host 0.0.0.0 --port 5173
```

#### Option 3: Serve with PM2 (Advanced)
Create `frontend/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'ai-voice-agent-frontend',
    script: 'npx',
    args: 'vite preview --host 0.0.0.0 --port 5173',
    cwd: '/path/to/your/aiVoiceAgent/frontend',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

Then start with PM2:
```bash
cd frontend
npm run build
pm2 start ecosystem.config.js
```

## 🌐 Network Configuration

### Firewall Rules
Ensure your server firewall allows traffic on the required ports:

```bash
# Ubuntu/Debian
sudo ufw allow 3001/tcp  # Backend
sudo ufw allow 5173/tcp  # Frontend

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --permanent --add-port=5173/tcp
sudo firewall-cmd --reload
```

### Access URLs

Once deployed, you can access:

- **Frontend**: `http://YOUR_SERVER_IP:5173`
- **Backend API**: `http://YOUR_SERVER_IP:3001`
- **Health Check**: `http://YOUR_SERVER_IP:3001/health`

## 📊 PM2 Management Commands

### Basic Commands
```bash
# List all processes
pm2 list

# Stop application
pm2 stop ai-voice-agent-backend

# Restart application
pm2 restart ai-voice-agent-backend

# Delete application
pm2 delete ai-voice-agent-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Monitoring
```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs ai-voice-agent-backend

# View specific log files
pm2 logs ai-voice-agent-backend --lines 100

# Clear logs
pm2 flush
```

### Process Management
```bash
# Reload application (zero-downtime)
pm2 reload ai-voice-agent-backend

# Scale application (if using cluster mode)
pm2 scale ai-voice-agent-backend 2

# Show detailed process info
pm2 show ai-voice-agent-backend
```

## 🔒 Security Considerations

### 1. Environment Variables
- Never commit `.env` files to version control
- Use strong, unique values for `JWT_SECRET` and `API_KEY`
- Regularly rotate API keys

### 2. Firewall Configuration
- Only open necessary ports (3001, 5173)
- Consider using a reverse proxy (nginx) for production
- Implement rate limiting

### 3. HTTPS Setup (Recommended for Production)
Consider setting up SSL/TLS certificates using Let's Encrypt:

```bash
# Install Certbot
sudo apt install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d your-domain.com
```

## 🐛 Troubleshooting

### Backend Issues
```bash
# Check if backend is running
pm2 status

# View backend logs
pm2 logs ai-voice-agent-backend

# Check port usage
netstat -tlnp | grep 3001

# Test backend health
curl http://localhost:3001/health
```

### Frontend Issues
```bash
# Check if frontend is accessible
curl http://YOUR_SERVER_IP:5173

# Check Vite configuration
cat vite.config.js

# Test local build
npm run build && npm run preview
```

### Common Issues

1. **Port Already in Use**
   ```bash
   # Find process using port
   lsof -i :3001
   
   # Kill process
   kill -9 <PID>
   ```

2. **Permission Denied**
   ```bash
   # Fix file permissions
   chmod +x dist/server.js
   ```

3. **Module Not Found**
   ```bash
   # Reinstall dependencies
   rm -rf node_modules package-lock.json
   npm install
   ```

## 📝 Quick Start Script

Create a `deploy.sh` script for easy deployment:

```bash
#!/bin/bash

echo "🚀 Deploying AI Voice Agent..."

# Backend
echo "📦 Building backend..."
cd backend
npm install
npm run build

echo "🔄 Starting backend with PM2..."
pm2 start ecosystem.config.js

# Frontend
echo "📦 Building frontend..."
cd ../frontend
npm install
npm run build

echo "🌐 Starting frontend..."
npm run preview -- --host 0.0.0.0 --port 5173 &

echo "✅ Deployment complete!"
echo "Frontend: http://$(curl -s ifconfig.me):5173"
echo "Backend: http://$(curl -s ifconfig.me):3001"
```

Make it executable and run:
```bash
chmod +x deploy.sh
./deploy.sh
```

## 📋 Environment Checklist

Before going live, ensure:

- [ ] All environment variables are set
- [ ] Backend builds successfully
- [ ] Frontend builds successfully
- [ ] PM2 is configured correctly
- [ ] Firewall ports are open
- [ ] SSL certificates are installed (for production)
- [ ] Database is accessible
- [ ] API keys are valid
- [ ] Logs directory exists and is writable

## 🔗 Useful Links

- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

---

**Note**: Replace `YOUR_SERVER_IP` with your actual server IP address throughout this guide. For production deployments, consider using a domain name and SSL certificates.
