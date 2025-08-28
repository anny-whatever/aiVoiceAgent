# Separate GCP VM Deployment Guide - Backend & Frontend

This guide shows how to deploy your AI Voice Agent with **MongoDB Atlas** and separate VMs for backend and frontend.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend VM   │    │   Backend VM    │    │  MongoDB Atlas  │
│   (React App)   │───▶│  (Node.js API)  │───▶│   (Cloud DB)    │
│   Port: 3000    │    │   Port: 3001    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerequisites

- Google Cloud Platform account
- MongoDB Atlas account and cluster
- `gcloud` CLI installed
- Domain names (optional, for SSL)

---

# Part 1: Backend VM Deployment

## Step 1: Create Backend VM

```bash
# Set variables
export PROJECT_ID="your-project-id"
export BACKEND_VM="aivoice-backend-vm"
export ZONE="us-central1-a"

# Create backend VM
gcloud compute instances create $BACKEND_VM \
    --project=$PROJECT_ID \
    --zone=$ZONE \
    --machine-type=e2-standard-2 \
    --network-interface=network-tier=PREMIUM,stack-type=IPV4_ONLY,subnet=default \
    --maintenance-policy=MIGRATE \
    --service-account=default \
    --scopes=https://www.googleapis.com/auth/cloud-platform \
    --tags=backend-server,http-server,https-server \
    --create-disk=auto-delete=yes,boot=yes,device-name=$BACKEND_VM,image=projects/ubuntu-os-cloud/global/images/ubuntu-2204-jammy-v20231213,mode=rw,size=30,type=projects/$PROJECT_ID/zones/$ZONE/diskTypes/pd-standard \
    --labels=environment=production,tier=backend,app=aivoice \
    --reservation-affinity=any

# Create firewall rule for backend
gcloud compute firewall-rules create allow-backend-api \
    --allow tcp:3001,tcp:80,tcp:443 \
    --source-ranges 0.0.0.0/0 \
    --target-tags backend-server \
    --description "Allow API traffic for backend"

# Get backend VM external IP
gcloud compute instances describe $BACKEND_VM --zone=$ZONE --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
```

## Step 2: Setup Backend VM

```bash
# SSH into backend VM
gcloud compute ssh $BACKEND_VM --zone=$ZONE

# Install Docker and Docker Compose
sudo apt update && sudo apt upgrade -y
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common git

# Install Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

## Step 3: Deploy Backend

```bash
# Clone repository (or upload files)
git clone https://github.com/your-username/aiVoiceAgent.git
cd aiVoiceAgent

# Create backend environment file
cp backend.env.example .env

# Edit environment file with your MongoDB Atlas connection string
nano .env
```

**Backend .env file:**
```env
# MongoDB Atlas Configuration
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/aivoice?retryWrites=true&w=majority

# Backend Configuration
NODE_ENV=production
PORT=3001

# Frontend URL (will be updated after frontend deployment)
FRONTEND_URL=http://your-frontend-vm-ip:3000
CORS_ORIGIN=*

# API Keys
OPENAI_API_KEY=your_openai_api_key_here
JWT_SECRET=your_super_secure_jwt_secret_here
```

```bash
# Deploy backend only
docker-compose -f docker-compose.backend.yml up --build -d

# Check status
docker-compose -f docker-compose.backend.yml ps

# View logs
docker-compose -f docker-compose.backend.yml logs -f

# Test backend health
curl http://localhost:3001/health
```

---

# Part 2: Frontend VM Deployment

## Step 1: Create Frontend VM

```bash
# Set variables
export FRONTEND_VM="aivoice-frontend-vm"

# Create frontend VM
gcloud compute instances create $FRONTEND_VM \
    --project=$PROJECT_ID \
    --zone=$ZONE \
    --machine-type=e2-medium \
    --network-interface=network-tier=PREMIUM,stack-type=IPV4_ONLY,subnet=default \
    --maintenance-policy=MIGRATE \
    --service-account=default \
    --scopes=https://www.googleapis.com/auth/cloud-platform \
    --tags=frontend-server,http-server,https-server \
    --create-disk=auto-delete=yes,boot=yes,device-name=$FRONTEND_VM,image=projects/ubuntu-os-cloud/global/images/ubuntu-2204-jammy-v20231213,mode=rw,size=20,type=projects/$PROJECT_ID/zones/$ZONE/diskTypes/pd-standard \
    --labels=environment=production,tier=frontend,app=aivoice \
    --reservation-affinity=any

# Create firewall rule for frontend
gcloud compute firewall-rules create allow-frontend-web \
    --allow tcp:3000,tcp:80,tcp:443 \
    --source-ranges 0.0.0.0/0 \
    --target-tags frontend-server \
    --description "Allow web traffic for frontend"

# Get frontend VM external IP
gcloud compute instances describe $FRONTEND_VM --zone=$ZONE --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
```

## Step 2: Setup Frontend VM

```bash
# SSH into frontend VM
gcloud compute ssh $FRONTEND_VM --zone=$ZONE

# Install Docker and Docker Compose (same as backend)
sudo apt update && sudo apt upgrade -y
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common git

# Install Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

## Step 3: Deploy Frontend

```bash
# Clone repository
git clone https://github.com/your-username/aiVoiceAgent.git
cd aiVoiceAgent

# Create frontend environment file
cp frontend.env.example .env

# Edit with backend VM IP
nano .env
```

**Frontend .env file:**
```env
# Backend API URL (use your backend VM external IP)
REACT_APP_API_URL=http://YOUR_BACKEND_VM_IP:3001
REACT_APP_WS_URL=ws://YOUR_BACKEND_VM_IP:3001
```

```bash
# Deploy frontend only
docker-compose -f docker-compose.frontend.yml up --build -d

# Check status
docker-compose -f docker-compose.frontend.yml ps

# View logs
docker-compose -f docker-compose.frontend.yml logs -f

# Test frontend
curl http://localhost:3000/health
```

---

# Part 3: Update Backend CORS Configuration

After deploying frontend, update backend CORS settings:

```bash
# SSH back to backend VM
gcloud compute ssh $BACKEND_VM --zone=$ZONE
cd aiVoiceAgent

# Update .env file with frontend VM IP
nano .env
```

Update these lines in backend .env:
```env
FRONTEND_URL=http://YOUR_FRONTEND_VM_IP:3000
CORS_ORIGIN=http://YOUR_FRONTEND_VM_IP:3000,http://localhost:3000
```

```bash
# Restart backend to apply changes
docker-compose -f docker-compose.backend.yml restart

# Verify
docker-compose -f docker-compose.backend.yml logs -f backend
```

---

# Part 4: MongoDB Atlas Setup

## Step 1: Configure MongoDB Atlas

1. **Create MongoDB Atlas Account**
   - Go to https://cloud.mongodb.com/
   - Create account and new project

2. **Create Cluster**
   - Choose free tier (M0) or paid tier
   - Select region (preferably same as your GCP region)
   - Create cluster

3. **Configure Database Access**
   - Go to Database Access
   - Add new database user
   - Set username/password
   - Grant read/write access

4. **Configure Network Access**
   - Go to Network Access
   - Add IP addresses:
     - Your backend VM external IP
     - `0.0.0.0/0` (for development, restrict in production)

5. **Get Connection String**
   - Go to Clusters → Connect
   - Choose "Connect your application"
   - Copy connection string
   - Replace `<password>` with your database user password

## Step 2: Test Database Connection

```bash
# SSH to backend VM
gcloud compute ssh $BACKEND_VM --zone=$ZONE

# Test MongoDB connection
docker-compose -f docker-compose.backend.yml exec backend node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => { console.log('MongoDB connected!'); process.exit(0); })
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });
"
```

---

# Part 5: Domain Setup (Optional)

## Backend Domain Setup

```bash
# SSH to backend VM
gcloud compute ssh $BACKEND_VM --zone=$ZONE

# Install nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# Create nginx config for backend
sudo nano /etc/nginx/sites-available/backend
```

**Backend Nginx Config:**
```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d api.your-domain.com
```

## Frontend Domain Setup

```bash
# SSH to frontend VM
gcloud compute ssh $FRONTEND_VM --zone=$ZONE

# Install nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# Create nginx config for frontend
sudo nano /etc/nginx/sites-available/frontend
```

**Frontend Nginx Config:**
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/frontend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

# Part 6: Monitoring and Maintenance

## Backend Monitoring Script

Create `backend-monitor.sh` on backend VM:

```bash
#!/bin/bash
echo "=== Backend Status ==="
echo "Date: $(date)"
echo
echo "=== Docker Status ==="
docker-compose -f docker-compose.backend.yml ps
echo
echo "=== Health Check ==="
curl -s http://localhost:3001/health || echo "Backend unhealthy"
echo
echo "=== System Resources ==="
free -h
df -h
echo
echo "=== Recent Logs ==="
docker-compose -f docker-compose.backend.yml logs --tail=20 backend
```

## Frontend Monitoring Script

Create `frontend-monitor.sh` on frontend VM:

```bash
#!/bin/bash
echo "=== Frontend Status ==="
echo "Date: $(date)"
echo
echo "=== Docker Status ==="
docker-compose -f docker-compose.frontend.yml ps
echo
echo "=== Health Check ==="
curl -s http://localhost:3000/health || echo "Frontend unhealthy"
echo
echo "=== System Resources ==="
free -h
df -h
echo
echo "=== Recent Logs ==="
docker-compose -f docker-compose.frontend.yml logs --tail=20 frontend
```

## Backup Script (Backend VM only)

```bash
#!/bin/bash
BACKUP_DIR="/home/$USER/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

echo "Creating backup at $DATE"

# Backup backend data
docker cp aivoice-backend:/app/data $BACKUP_DIR/backend_data_$DATE

# Compress backup
cd $BACKUP_DIR
tar -czf backend_backup_$DATE.tar.gz backend_data_$DATE
rm -rf backend_data_$DATE

echo "Backup completed: backend_backup_$DATE.tar.gz"

# Keep only last 7 backups
ls -t backend_backup_*.tar.gz | tail -n +8 | xargs -r rm
```

---

# Part 7: Useful Commands

## Backend VM Commands

```bash
# View backend logs
docker-compose -f docker-compose.backend.yml logs -f

# Restart backend
docker-compose -f docker-compose.backend.yml restart

# Update backend
git pull
docker-compose -f docker-compose.backend.yml up --build -d

# Check backend health
curl http://localhost:3001/health
```

## Frontend VM Commands

```bash
# View frontend logs
docker-compose -f docker-compose.frontend.yml logs -f

# Restart frontend
docker-compose -f docker-compose.frontend.yml restart

# Update frontend
git pull
docker-compose -f docker-compose.frontend.yml up --build -d

# Check frontend health
curl http://localhost:3000/health
```

## MongoDB Atlas Commands

```bash
# Test connection from backend VM
docker-compose -f docker-compose.backend.yml exec backend node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected!'))
  .catch(console.error);
"
```

---

# Part 8: Troubleshooting

## Common Issues

### 1. CORS Errors
- Update backend CORS_ORIGIN with frontend VM IP
- Restart backend after changes

### 2. MongoDB Connection Issues
- Check Atlas network access settings
- Verify connection string format
- Check backend VM IP is whitelisted

### 3. Frontend Can't Connect to Backend
- Verify backend VM firewall rules
- Check REACT_APP_API_URL in frontend .env
- Test backend health endpoint directly

### 4. SSL Certificate Issues
- Ensure DNS points to correct VM IPs
- Check nginx configuration
- Verify certbot installation

## Debugging Commands

```bash
# Check firewall rules
gcloud compute firewall-rules list

# Check VM external IPs
gcloud compute instances list

# Test connectivity between VMs
# From frontend VM:
curl http://BACKEND_VM_IP:3001/health

# Check nginx status
sudo systemctl status nginx

# Check docker logs
docker logs aivoice-backend
docker logs aivoice-frontend
```

---

# Summary

Your AI Voice Agent is now deployed with:

- **Backend VM**: `http://BACKEND_VM_IP:3001`
- **Frontend VM**: `http://FRONTEND_VM_IP:3000`
- **Database**: MongoDB Atlas (cloud)

## Access URLs:
- **Frontend**: `http://YOUR_FRONTEND_VM_IP:3000`
- **Backend API**: `http://YOUR_BACKEND_VM_IP:3001`
- **With domains**: `https://your-domain.com` and `https://api.your-domain.com`

This setup provides better scalability, security, and separation of concerns compared to a single VM deployment.
