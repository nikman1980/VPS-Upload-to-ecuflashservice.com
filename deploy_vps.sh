#!/bin/bash

# ============================================
# ECU Flash Service - Automated Deployment Script
# Run this on your VPS as root
# ============================================

set -e  # Exit on error

echo "=========================================="
echo "  ECU Flash Service - VPS Deployment"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Update System
echo -e "${GREEN}[1/10] Updating system...${NC}"
apt update && apt upgrade -y
apt install -y curl wget git unzip nano ufw software-properties-common

# Step 2: Install Node.js
echo -e "${GREEN}[2/10] Installing Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g yarn

# Step 3: Install Python
echo -e "${GREEN}[3/10] Installing Python 3...${NC}"
apt install -y python3 python3-pip python3-venv

# Step 4: Install MongoDB
echo -e "${GREEN}[4/10] Installing MongoDB 7.0...${NC}"
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org
systemctl start mongod
systemctl enable mongod

# Step 5: Install Nginx
echo -e "${GREEN}[5/10] Installing Nginx...${NC}"
apt install -y nginx
systemctl start nginx
systemctl enable nginx

# Step 6: Configure Firewall
echo -e "${GREEN}[6/10] Configuring firewall...${NC}"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Step 7: Create directories
echo -e "${GREEN}[7/10] Creating application directories...${NC}"
mkdir -p /var/www/ecuflash/backend
mkdir -p /var/www/ecuflash/frontend
mkdir -p /var/www/ecuflash/uploads
chmod 755 /var/www/ecuflash/uploads

# Step 8: Create systemd service
echo -e "${GREEN}[8/10] Creating backend service...${NC}"
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

# Step 9: Configure Nginx
echo -e "${GREEN}[9/10] Configuring Nginx...${NC}"
cat > /etc/nginx/sites-available/ecuflash << 'EOF'
server {
    listen 80;
    server_name ecuflashservice.com www.ecuflashservice.com _;

    location / {
        root /var/www/ecuflash/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

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
        client_max_body_size 100M;
    }
}
EOF

ln -sf /etc/nginx/sites-available/ecuflash /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# Step 10: Install Certbot
echo -e "${GREEN}[10/10] Installing Certbot for SSL...${NC}"
apt install -y certbot python3-certbot-nginx

echo ""
echo "=========================================="
echo -e "${GREEN}  BASE INSTALLATION COMPLETE!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Upload your application code to /var/www/ecuflash/"
echo "2. Set up backend: cd /var/www/ecuflash/backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
echo "3. Set up frontend: cd /var/www/ecuflash/frontend && yarn install && yarn build"
echo "4. Start backend: systemctl start ecuflash-backend"
echo "5. Get SSL: certbot --nginx -d ecuflashservice.com -d www.ecuflashservice.com"
echo ""
echo "Server IP: $(curl -s ifconfig.me)"
echo ""
