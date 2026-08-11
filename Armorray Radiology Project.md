# Armorray Radiology Project — Production Deployment Guide

> **Written from real deployment experience on CyberPanel/OpenLiteSpeed VPS.**
> This guide covers every file, every command, and every gotcha encountered during production deployment.

---

## Architecture Overview

```mermaid
graph TB
    subgraph Internet
        Browser["🌐 User Browser"]
    end

    subgraph VPS["VPS Server (CyberPanel)"]
        OLS["OpenLiteSpeed<br/>:443 (SSL) / :80"]

        subgraph Nginx["Nginx Reverse Proxy :8080"]
            direction TB
            N_OHIF["/basic, /longitudinal → OHIF"]
            N_ASSETS["/*.js, /*.css, /*.wasm → OHIF assets"]
            N_DICOM["/dicom-web/ → Orthanc"]
            N_SOCKET["/socket.io/ → Backend"]
            N_SPA["/* → Frontend SPA"]
        end

        subgraph Docker["Docker Containers"]
            OHIF["OHIF Viewer<br/>127.0.0.1:3000 → :80"]
            Orthanc["Orthanc Server<br/>0.0.0.0:8042 → :8042<br/>0.0.0.0:4242 → :4242"]
        end

        Backend["Backend API (PM2)<br/>:5000"]
        Frontend["Frontend Build<br/>/home/armorray.com/public_html/"]
        MongoDB["MongoDB Atlas<br/>(External)"]
    end

    Browser -->|"https://armorray.com"| OLS
    OLS -->|"Proxy all requests"| Nginx
    N_OHIF --> OHIF
    N_ASSETS --> OHIF
    N_DICOM -->|"+ Basic Auth header"| Orthanc
    N_SOCKET -->|"WebSocket upgrade"| Backend
    N_SPA --> Frontend
    Backend --> Orthanc
    Backend --> MongoDB
```

---

## Request Flow Diagram

```mermaid
sequenceDiagram
    participant B as Browser
    participant OLS as OpenLiteSpeed (:443)
    participant NGX as Nginx (:8080)
    participant OHIF as OHIF Viewer (:3000)
    participant ORT as Orthanc (:8042)
    participant API as Backend (:5000)

    Note over B,OLS: User clicks "View Study"
    B->>OLS: GET /basic?StudyInstanceUIDs=xxx
    OLS->>NGX: Proxy (preserves Host header)
    NGX->>OHIF: regex match → proxy_pass
    OHIF-->>B: OHIF index.html + JS bundles

    Note over B,ORT: OHIF loads DICOM images
    B->>OLS: GET /dicom-web/studies/xxx/series
    OLS->>NGX: Proxy
    NGX->>ORT: proxy_pass + Authorization header
    ORT-->>B: DICOM JSON/images

    Note over B,API: Dashboard / Login
    B->>OLS: GET /dashboard/technician
    OLS->>NGX: Proxy
    NGX-->>B: Frontend index.html (SPA)
    B->>OLS: GET /api/cases
    Note right of OLS: api.armorray.com
    OLS->>API: Proxy
    API-->>B: JSON response
```

---

## Services Summary

| Service | Technology | Internal Port | External Access | Process Manager |
|:---|:---|:---|:---|:---|
| **Frontend** | React + Vite (static build) | — | `https://armorray.com` | Static files |
| **Backend API** | Node.js + Express | `:5000` | `https://api.armorray.com/api` | PM2 |
| **OHIF Viewer** | React (Docker + Nginx) | `127.0.0.1:3000` → `:80` | `https://armorray.com/basic` | Docker |
| **Orthanc** | DICOM Server (Docker) | `0.0.0.0:8042`, `0.0.0.0:4242` | Via Nginx `/dicom-web/` | Docker |
| **MongoDB** | MongoDB Atlas | — | Cloud connection | External |
| **Redis** (optional) | Redis (Docker) | `:6379` | Internal only | Docker |

---

## Step 1: Prerequisites

```bash
# Required on VPS
node -v          # Node.js 18+
npm -v           # npm 9+
docker --version # Docker 20+
pm2 -v           # PM2 process manager
```

Install if missing:
```bash
# Node.js (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 18

# Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker

# PM2
npm install -g pm2

# Nginx (as internal reverse proxy)
yum install -y nginx   # CentOS/AlmaLinux
systemctl enable nginx && systemctl start nginx
```

---

## Step 2: Directory Structure

```
/home/armorray.com/
├── public_html/              ← Frontend build (index.html, assets/)
│   ├── index.html
│   ├── assets/               ← Vite output (JS/CSS/images)
│   └── .htaccess
├── backend/                  ← Backend source code
│   ├── .env                  ← Backend environment vars
│   ├── server.js
│   ├── uploads/              ← DICOM file storage
│   └── ...
├── Viewers/                  ← OHIF Viewer source (for building Docker image)
│   └── platform/app/public/config/
│       └── armorray-production.js  ← OHIF DICOMweb config
└── docker-compose.yml        ← Orthanc + Redis containers
```

---

## Step 3: Environment Variables

### Backend [.env](file:///c:/Users/Admin/Documents/GitHub/Radiology-Project/backend/.env)

**File:** `/home/armorray.com/backend/.env`

```env
PORT=5000
NODE_ENV=production

# MongoDB
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>

# Authentication
JWT_SECRET=<generate-a-strong-64-char-random-string>

# URLs — CRITICAL: update these to your domain
FRONTEND_URL=https://armorray.com
BASE_URL=https://api.armorray.com
ALLOWED_ORIGINS=https://armorray.com

# Orthanc (same VPS, accessed internally)
ORTHANC_URL=http://localhost:8042
ORTHANC_USER=orthanc
ORTHANC_PASSWORD=orthanc

# AI Service (if deployed)
AI_SERVICE_URL=http://127.0.0.1:8000

# Redis (optional, for Socket.io scaling)
REDIS_URL=redis://127.0.0.1:6379
```

### Frontend [.env](file:///c:/Users/Admin/Documents/GitHub/Radiology-Project/backend/.env)

**File:** `/home/armorray.com/frontend/.env`

```env
VITE_API_URL=https://api.armorray.com/api
VITE_SOCKET_URL=https://armorray.com
VITE_OHIF_URL=https://armorray.com
```

> [!IMPORTANT]
> - `VITE_OHIF_URL=https://armorray.com` — no port, no `/ohif/` prefix. OHIF modes (`/basic`, `/longitudinal`) are served from the same domain.
> - `VITE_SOCKET_URL=https://armorray.com` — Socket.io goes through the Nginx `/socket.io/` proxy.
> - After changing [.env](file:///c:/Users/Admin/Documents/GitHub/Radiology-Project/backend/.env), you MUST rebuild the frontend (`npm run build`) since Vite bakes these into the bundle.

### Hardcoded URL Warnings

These files have `localhost` fallbacks. The env vars above override them, but be aware:

| Layer | File | Hardcoded Fallback | Env Override |
|:---|:---|:---|:---|
| Frontend | [axios.ts](file:///c:/Users/Admin/Documents/GitHub/Radiology-Project/frontend/src/lib/axios.ts) | `http://localhost:5000/api` | `VITE_API_URL` |
| Frontend | [socketService.ts](file:///c:/Users/Admin/Documents/GitHub/Radiology-Project/frontend/src/services/socketService.ts) | `http://localhost:5000` | `VITE_SOCKET_URL` |
| Frontend | [useSocket.ts](file:///c:/Users/Admin/Documents/GitHub/Radiology-Project/frontend/src/hooks/useSocket.ts) | `http://localhost:5000` | `VITE_SOCKET_URL` |
| Frontend | [DICOMManager.tsx](file:///c:/Users/Admin/Documents/GitHub/Radiology-Project/frontend/src/features/technician/components/DICOMManager.tsx) | `http://localhost:8000` | `VITE_AI_URL` |
| Frontend | [ReportingEditor.tsx](file:///c:/Users/Admin/Documents/GitHub/Radiology-Project/frontend/src/features/radiologist/components/ReportingEditor.tsx) | `http://localhost:5000` | `VITE_API_URL` |
| Frontend | [ReportEditorWindow.tsx](file:///c:/Users/Admin/Documents/GitHub/Radiology-Project/frontend/src/components/viewer/ReportEditorWindow.tsx) | `http://localhost:5000` | `VITE_API_URL` |
| Frontend | [IntegrityInsights.tsx](file:///c:/Users/Admin/Documents/GitHub/Radiology-Project/frontend/src/components/cases/IntegrityInsights.tsx) | `http://localhost:5000/api` | `VITE_API_URL` |
| Backend | [aiConfig.js](file:///c:/Users/Admin/Documents/GitHub/Radiology-Project/backend/config/aiConfig.js) | `http://127.0.0.1:8000` | `AI_SERVICE_URL` |
| Backend | [dicomSCP.js](file:///c:/Users/Admin/Documents/GitHub/Radiology-Project/backend/config/dicomSCP.js) | `http://localhost:5000` | `BASE_URL` |
| Backend | [OrthancSyncService.js](file:///c:/Users/Admin/Documents/GitHub/Radiology-Project/backend/services/OrthancSyncService.js) | `http://localhost:8042` | `ORTHANC_URL` |
| Backend | [socketSetup.js](file:///c:/Users/Admin/Documents/GitHub/Radiology-Project/backend/utils/socketSetup.js) | `http://localhost:8080` | `FRONTEND_URL` |
| Backend | [env.js](file:///c:/Users/Admin/Documents/GitHub/Radiology-Project/backend/config/env.js) | `http://localhost:3000` | `FRONTEND_URL` |
| Backend | [server.js](file:///c:/Users/Admin/Documents/GitHub/Radiology-Project/backend/server.js) | `localhost:3000,8080,5173` | `ALLOWED_ORIGINS` |

---

## Step 4: Docker Containers

### 4a. Orthanc (DICOM Server)

**File:** `/home/armorray.com/docker-compose.yml`

```yaml
services:
  orthanc:
    image: jodogne/orthanc-plugins:latest
    container_name: orthanc_engine
    restart: always
    ports:
      - "0.0.0.0:8042:8042"   # REST API + DICOMweb
      - "0.0.0.0:4242:4242"   # DICOM protocol (C-STORE/C-FIND)
    volumes:
      - orthanc_data:/var/lib/orthanc/db    # Persistent storage
    environment:
      - ORTHANC_NAME=Orthanc inside Docker

volumes:
  orthanc_data:
    name: public_html_orthanc_data
```

Key Orthanc settings (inside the container at `/etc/orthanc/orthanc.json`):
- `RemoteAccessAllowed: true` — allows external API access
- `DicomAlwaysAllowStore: true` — accepts incoming DICOM files
- `AuthenticationEnabled` — enabled by default when RemoteAccessAllowed is true
- Default credentials: `orthanc` / `orthanc`

```bash
# Start Orthanc
docker-compose up -d

# Verify
curl -u orthanc:orthanc http://localhost:8042/system
curl -u orthanc:orthanc http://localhost:8042/studies
```

### 4b. OHIF Viewer

**Step 1: Create the production config**

**File:** `/home/armorray.com/Viewers/platform/app/public/config/armorray-production.js`

```js
/** @type {AppTypes.Config} */
window.config = {
  routerBasename: '/',
  showStudyList: false,
  extensions: [],
  modes: [],
  showWarningMessageForCrossOrigin: true,
  showCPUFallbackMessage: true,
  showLoadingIndicator: true,
  strictZSpacingForVolumeViewport: true,
  maxNumberOfWebWorkers: 3,
  showErrorDetails: 'always',
  defaultDataSourceName: 'orthanc',
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'orthanc',
      configuration: {
        friendlyName: 'Armorray Orthanc Server',
        name: 'Orthanc',
        wadoUriRoot: '/dicom-web',
        qidoRoot: '/dicom-web',
        wadoRoot: '/dicom-web',
        qidoSupportsIncludeField: false,
        imageRendering: 'wadors',
        thumbnailRendering: 'wadors',
        enableStudyLazyLoad: true,
        supportsFuzzyMatching: false,
        supportsWildcard: true,
        dicomUploadEnabled: true,
        omitQuotationForMultipartRequest: true,
      },
    },
  ],
  httpErrorHandler: error => {
    console.warn(`HTTP Error Handler (status: ${error.status})`, error);
  },
};
```

> [!IMPORTANT]
> The DICOMweb URLs (`wadoRoot`, `qidoRoot`, `wadoUriRoot`) are **relative** (`/dicom-web`). This means
> OHIF makes requests to the same domain it's served from (e.g., `https://armorray.com/dicom-web/studies`).
> Nginx then proxies `/dicom-web/` to Orthanc internally. **No CORS issues.**

**Step 2: Build the Docker image**

```bash
cd /home/armorray.com/Viewers

# Build (takes 5-15 minutes)
docker build \
  --build-arg APP_CONFIG=config/armorray-production.js \
  --build-arg PUBLIC_URL=/ \
  -t ohif-viewer:latest .
```

**Step 3: Run the container with volume-mounted config**

```bash
docker run -d \
  --name ohif_viewer \
  --restart always \
  -p 127.0.0.1:3000:80 \
  -v /home/armorray.com/Viewers/platform/app/public/config/armorray-production.js:/usr/share/nginx/html/app-config.js:ro \
  ohif-viewer:latest
```

> [!TIP]
> The `-v` flag mounts your config permanently. Without it, `docker cp` changes are lost on container restart.

**Verify:**
```bash
docker ps | grep ohif
curl -s http://127.0.0.1:3000/ | head -3
# Should return: <!doctype html><html lang="en">...
```

---

## Step 5: Nginx Reverse Proxy

Nginx runs internally on port **8080** and handles all the routing logic. OpenLiteSpeed (CyberPanel) handles SSL termination on ports 80/443 and forward everything to Nginx.

**File:** `/etc/nginx/conf.d/armorray.com.conf`

```nginx
server {
    listen 8080;
    server_name armorray.com;
    client_max_body_size 10G;

    # Root for frontend static files
    root /home/armorray.com/public_html;

    # ── DICOMweb proxy to Orthanc ──────────────────────────────
    # OHIF makes requests to /dicom-web/* which we proxy to Orthanc
    # The Authorization header provides Orthanc basic auth (orthanc:orthanc)
    location /dicom-web/ {
        proxy_pass http://127.0.0.1:8042/dicom-web/;
        proxy_set_header Authorization "Basic b3J0aGFuYzpvcnRoYW5j";
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ── OHIF Viewer mode routes ────────────────────────────────
    # When user clicks "View Study", it opens /basic?StudyInstanceUIDs=...
    location ~ ^/(basic|longitudinal|segmentation|tmtv|microscopy|preclinical-4d) {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ── OHIF static assets (JS/CSS bundles) ────────────────────
    location /static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }

    # ── OHIF config & misc files ───────────────────────────────
    location = /app-config.js {
        proxy_pass http://127.0.0.1:3000;
    }
    location /ort/ {
        proxy_pass http://127.0.0.1:3000;
    }

    # ── OHIF root-level assets (bundles, wasm, etc.) ───────────
    # OHIF outputs JS/CSS/WASM files at root level (e.g., /app.bundle.xxx.js)
    # Frontend assets are in /assets/, so no conflict
    # Try local file first, fallback to OHIF container
    location ~* ^/[^/]+\.(js|css|wasm|json|svg)(\.gz)?$ {
        try_files $uri @ohif_assets;
    }
    location @ohif_assets {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }

    # ── Socket.io (real-time to backend) ───────────────────────
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ── Frontend SPA (catch-all, must be LAST) ─────────────────
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Routing Summary

```mermaid
graph LR
    subgraph "Nginx :8080 — Request Routing"
        A["/basic?StudyInstanceUIDs=..."] -->|regex| OHIF["OHIF :3000"]
        B["/dicom-web/studies/..."] -->|prefix| ORT["Orthanc :8042<br/>+ Auth header"]
        C["/app.bundle.xxx.js"] -->|regex *.js| OHIF2["OHIF :3000"]
        D["/socket.io/"] -->|prefix| API["Backend :5000<br/>WebSocket upgrade"]
        E["/app-config.js"] -->|exact| OHIF3["OHIF :3000"]
        F["/dashboard/technician"] -->|catch-all /| SPA["public_html/<br/>index.html"]
        G["/assets/index.xxx.js"] -->|catch-all /| STATIC["public_html/<br/>assets/"]
    end
```

**Apply the config:**
```bash
nginx -t          # Test syntax
nginx -s reload   # Apply changes
```

---

## Step 6: OpenLiteSpeed Proxy (CyberPanel)

OpenLiteSpeed handles SSL/TLS on ports 80/443. It must forward **all requests** to Nginx on port 8080.

**File:** `/usr/local/lsws/conf/vhosts/armorray.com/vhost.conf`

Add these blocks **before** the `context /.well-known/acme-challenge` section:

```apache
extprocessor nginx_backend {
  type                    proxy
  address                 127.0.0.1:8080
  maxConns                100
  pcKeepAliveTimeout      60
  initTimeout             60
  retryTimeout            0
  respBuffer              0
}

context / {
  type                    proxy
  handler                 nginx_backend
  addDefaultCharset       off
}
```

> [!IMPORTANT]
> The `context /.well-known/acme-challenge` block MUST remain for Let's Encrypt SSL renewal.
> More specific contexts (like `.well-known`) take priority over the catch-all `/` context.

**File permissions fix** (Nginx runs as `nginx` user, files owned by `armor2543`):
```bash
chmod -R o+rx /home/armorray.com/public_html/
chmod o+x /home/armorray.com/ /home/armorray.com/public_html/
```

**Restart OpenLiteSpeed:**
```bash
systemctl restart lsws
```

### Complete Traffic Flow

```
Browser
  │
  ▼
OpenLiteSpeed (:443 SSL)
  │  ← Handles SSL termination, passes Host header
  ▼
Nginx (:8080)
  │
  ├── /basic, /longitudinal...  → OHIF Docker (:3000)
  ├── /dicom-web/*              → Orthanc Docker (:8042) + Basic Auth
  ├── /*.js, /*.css, /*.wasm    → try local → OHIF Docker (:3000)
  ├── /app-config.js            → OHIF Docker (:3000)
  ├── /socket.io/*              → Backend PM2 (:5000) + WebSocket
  └── /* (everything else)      → public_html/index.html (Frontend SPA)
```

---

## Step 7: Backend Deployment

```bash
cd /home/armorray.com/backend

# Install dependencies
npm install --production

# Start with PM2
pm2 start server.js --name armorray-api --node-args="--experimental-specifier-resolution=node"

# Save PM2 config for auto-restart
pm2 save
pm2 startup
```

---

## Step 8: Frontend Build & Deploy

```bash
cd /home/armorray.com/frontend

# Install and build
npm install
npm run build

# Copy build output to public_html
cp -r dist/* /home/armorray.com/public_html/

# Fix permissions for Nginx
chmod -R o+rx /home/armorray.com/public_html/
```

---

## Step 9: Verification Checklist

| # | Check | Command / URL | Expected Result |
|:--|:---|:---|:---|
| 1 | Frontend loads | `https://armorray.com` | Landing page HTML |
| 2 | Backend health | `curl https://api.armorray.com/api/health` | `{"status":"OK"}` |
| 3 | OHIF container | `curl http://127.0.0.1:3000/` | OHIF HTML |
| 4 | Orthanc API | `curl -u orthanc:orthanc http://localhost:8042/studies` | JSON array |
| 5 | DICOMweb proxy | `curl -H "Host: armorray.com" http://127.0.0.1:8080/dicom-web/studies` | DICOM JSON |
| 6 | OHIF via browser | `https://armorray.com/basic?StudyInstanceUIDs=<id>` | OHIF viewer with study |
| 7 | Socket.io | Check browser console for "Socket connected" | No connection errors |
| 8 | OHIF bundles | `curl -sI https://armorray.com/app.bundle.xxx.js` | `Content-Type: application/javascript` |

---

## Step 10: SSL Certificate (Let's Encrypt)

CyberPanel manages SSL automatically via Let's Encrypt.

**SSL cert paths** (used in `vhost.conf`):
```
Key:  /etc/letsencrypt/live/armorray.com/privkey.pem
Cert: /etc/letsencrypt/live/armorray.com/fullchain.pem
```

**Renew manually if needed:**
```bash
certbot renew
systemctl restart lsws
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|:---|:---|:---|
| 404 on `/basic?StudyInstanceUIDs=...` | OpenLiteSpeed not proxying to Nginx | Add `extprocessor` + `context /` to `vhost.conf`, restart `lsws` |
| 500 Internal Server Error | Nginx can't read `public_html` files (permission denied) | `chmod -R o+rx /home/armorray.com/public_html/` |
| OHIF loads but "no studies found" | DICOMweb proxy missing Orthanc auth header | Add `proxy_set_header Authorization "Basic b3J0aGFuYzpvcnRoYW5j";` to `/dicom-web/` |
| JS files return HTML (`Unexpected token '<'`) | OHIF root-level bundles not proxied to container | Add `location ~* ^/[^/]+\.(js\|css\|wasm)` block to Nginx |
| OHIF blank page after container restart | `app-config.js` was copied via `docker cp` (not persistent) | Use `-v` volume mount when running container |
| CORS errors in browser | Backend `ALLOWED_ORIGINS` doesn't include frontend URL | Update `ALLOWED_ORIGINS=https://armorray.com` in backend [.env](file:///c:/Users/Admin/Documents/GitHub/Radiology-Project/backend/.env) |
| Socket.io not connecting | Missing WebSocket upgrade headers in Nginx | Ensure `/socket.io/` block has `Upgrade` and `Connection "upgrade"` headers |
| Mixed content warnings | Frontend on HTTPS but API/Orthanc on HTTP | All services must go through HTTPS (via Nginx proxy) |
| `curl http://localhost:8042/studies` returns empty | Orthanc requires auth | Use `curl -u orthanc:orthanc http://localhost:8042/studies` |

---

## Quick Reference: All Config Files

| File | Location on VPS | Purpose |
|:---|:---|:---|
| Backend [.env](file:///c:/Users/Admin/Documents/GitHub/Radiology-Project/backend/.env) | `/home/armorray.com/backend/.env` | Backend URLs, DB, JWT, CORS |
| Frontend [.env](file:///c:/Users/Admin/Documents/GitHub/Radiology-Project/backend/.env) | `/home/armorray.com/frontend/.env` | API URL, Socket URL, OHIF URL |
| OHIF config | `armorray-production.js` (volume-mounted) | DICOMweb data source for OHIF |
| Nginx config | `/etc/nginx/conf.d/armorray.com.conf` | Reverse proxy routing (port 8080) |
| OLS vhost | `/usr/local/lsws/conf/vhosts/armorray.com/vhost.conf` | SSL + proxy to Nginx |
| Docker Compose | `/home/armorray.com/docker-compose.yml` | Orthanc + Redis containers |
| Orthanc config | Inside Docker at `/etc/orthanc/orthanc.json` | DICOM server settings |

---

## Restart Commands Cheat Sheet

```bash
# Restart backend
pm2 restart armorray-api

# Restart Nginx (after config change)
nginx -t && nginx -s reload

# Restart OpenLiteSpeed (after vhost.conf change)
systemctl restart lsws

# Restart OHIF Viewer
docker restart ohif_viewer

# Restart Orthanc
docker restart orthanc_engine

# Rebuild frontend (after .env change)
cd /home/armorray.com/frontend && npm run build
cp -r dist/* /home/armorray.com/public_html/
chmod -R o+rx /home/armorray.com/public_html/
```
