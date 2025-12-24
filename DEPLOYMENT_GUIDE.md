# ECU Flash Service - VPS Deployment Guide
# Hostinger KVM 2 - Ubuntu 24.04 LTS
# Server IP: 72.62.160.230

## ============================================
## STEP 1: Connect to Your VPS
## ============================================

# Option A: Using Terminal (Mac/Linux)
ssh root@72.62.160.230

# Option B: Using PuTTY (Windows)
# Download PuTTY: https://www.putty.org
# Host: 72.62.160.230
# Port: 22
# Username: root

# Option C: Use Hostinger's Browser Console
# hPanel → VPS → Click on server → Console


## ============================================
## STEP 2: Initial Server Setup (Run these commands)
## ============================================

# Update system packages
apt update && apt upgrade -y

# Install essential tools
apt install -y curl wget git unzip nano ufw software-properties-common

# Set timezone (change to your timezone if needed)
timedatectl set-timezone UTC


## ============================================
## STEP 3: Install Node.js 20 LTS
## ============================================

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version
npm --version

# Install Yarn
npm install -g yarn


## ============================================
## STEP 4: Install Python 3.11+
## ============================================

apt install -y python3 python3-pip python3-venv
python3 --version
pip3 --version


## ============================================
## STEP 5: Install MongoDB 7.0
## ============================================

# Import MongoDB GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
apt update
apt install -y mongodb-org

# Start and enable MongoDB
systemctl start mongod
systemctl enable mongod
systemctl status mongod


## ============================================
## STEP 6: Install Nginx (Web Server)
## ============================================

apt install -y nginx
systemctl start nginx
systemctl enable nginx


## ============================================
## STEP 7: Configure Firewall
## ============================================

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 80
ufw allow 443
ufw --force enable
ufw status


## ============================================
## STEP 8: Create Application Directory
## ============================================

mkdir -p /var/www/ecuflash
cd /var/www/ecuflash


## ============================================
## STEP 9: Download Application Code
## ============================================

# You'll need to transfer your code here
# Option 1: Git clone (if you have a repo)
# Option 2: SCP from local machine
# Option 3: Download from Emergent platform

# Create directory structure
mkdir -p backend frontend


## ============================================
## STEP 10: Backend Setup
## ============================================

cd /var/www/ecuflash/backend

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies (after copying requirements.txt)
pip install -r requirements.txt

# Create .env file
nano .env
# Add your environment variables:
# MONGO_URL="mongodb://localhost:27017"
# DB_NAME="ecuflash_production"
# RESEND_API_KEY="re_K2RZqPYV_8CnzGg6Nsu7VMgYebqdhxJFs"
# SENDER_EMAIL="onboarding@resend.dev"
# etc.


## ============================================
## STEP 11: Frontend Setup
## ============================================

cd /var/www/ecuflash/frontend

# Install dependencies (after copying package.json)
yarn install

# Build for production
yarn build


## ============================================
## STEP 12: Create Systemd Service for Backend
## ============================================

cat > /etc/systemd/system/ecuflash-backend.service << 'EOF'
[Unit]
Description=ECU Flash Service Backend
After=network.target mongod.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/ecuflash/backend
Environment=PATH=/var/www/ecuflash/backend/venv/bin
ExecStart=/var/www/ecuflash/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ecuflash-backend
systemctl start ecuflash-backend
systemctl status ecuflash-backend


## ============================================
## STEP 13: Configure Nginx
## ============================================

cat > /etc/nginx/sites-available/ecuflash << 'EOF'
server {
    listen 80;
    server_name ecuflashservice.com www.ecuflashservice.com 72.62.160.230;

    # Frontend (React build)
    location / {
        root /var/www/ecuflash/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        client_max_body_size 100M;
    }

    # File uploads
    location /uploads {
        alias /var/www/ecuflash/uploads;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/ecuflash /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t
systemctl reload nginx


## ============================================
## STEP 14: Install SSL Certificate (HTTPS)
## ============================================

# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
certbot --nginx -d ecuflashservice.com -d www.ecuflashservice.com

# Auto-renewal is configured automatically


## ============================================
## STEP 15: Create uploads directory
## ============================================

mkdir -p /var/www/ecuflash/uploads
chmod 755 /var/www/ecuflash/uploads


## ============================================
## VERIFICATION COMMANDS
## ============================================

# Check all services are running
systemctl status mongod
systemctl status ecuflash-backend
systemctl status nginx

# Check logs
journalctl -u ecuflash-backend -f
tail -f /var/log/nginx/error.log

# Test backend
curl http://localhost:8001/api/services

# Test from browser
# http://72.62.160.230
# https://ecuflashservice.com (after DNS setup)


## ============================================
## DOMAIN DNS SETTINGS
## ============================================

# In your domain registrar (or Hostinger Domains):
# Add these DNS records:

# Type: A
# Name: @
# Value: 72.62.160.230
# TTL: 3600

# Type: A
# Name: www
# Value: 72.62.160.230
# TTL: 3600

# Type: CNAME (optional)
# Name: www
# Value: ecuflashservice.com
# TTL: 3600


## ============================================
## USEFUL COMMANDS
## ============================================

# Restart backend
systemctl restart ecuflash-backend

# View backend logs
journalctl -u ecuflash-backend -f

# Restart Nginx
systemctl restart nginx

# MongoDB shell
mongosh

# Check disk space
df -h

# Check memory
free -h

# Check running processes
htop
