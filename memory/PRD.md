# ECU Flash Service - Product Requirements Document

## Original Problem Statement
Build a professional ECU tuning service platform that allows users to upload ECU files, select modification services (DPF delete, EGR delete, AdBlue delete, DTC removal, stage tuning), process payments via PayPal, and receive modified files within 20-60 minutes.

## Core Requirements
- User registration and authentication
- Vehicle selection workflow (type > manufacturer > model > engine > ECU)
- ECU file upload and analysis
- Service selection with dynamic pricing
- PayPal payment integration
- File processing and delivery
- Customer portal for order history

## Tech Stack
- **Frontend**: React + TailwindCSS + Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Payments**: PayPal

## What Has Been Implemented

### January 3, 2025 - UI Redesign Completed
- **Simplified Reviews Section**: 4 visible reviews + expandable "View More" button (8 total)
- **Organized Services Section**: Grouped into 3 categories using ACTUAL API prices:
  - Emission System Delete (EGR $50, DPF $248, AdBlue $698, Catalyst $40)
  - DTC Code Removal ($10, $20, $30)
  - Additional Services (Speed Limiter $30, Start/Stop $40, etc.)
- **Transparent Pricing**: Clean 2-column grid showing ALL services with ACTUAL API prices
- **Compact How It Works**: 6-step visual process with icons
- **Why Choose Us**: Integrated into blue gradient banner

### Previously Completed
- Core DTC Tool functionality (upload, analyze, process)
- User registration with auto-login after registration
- Forgot Password feature with email notifications
- File persistence in MongoDB (survives redeployment)
- PayPal integration (needs external testing)
- SEO: Sitemap with all 18 pages, Google schema fixes
- Contact form with email notifications
- Consistent blue gradient theme across all pages
- Dark footer design
- "Customer Portal" renamed from "My Orders"

## Known Issues
1. **PayPal Payment** - Unverified by third party (user self-testing blocked by PayPal fraud detection)
2. **ESLint Warnings** - Quote escaping in JSX (non-breaking)

## Pending/Future Tasks

### P0 - Critical
- Get third-party to test live PayPal payment

### P1 - High Priority
- Redeploy application to push all changes live

### P2 - Future Features
- PWA conversion for mobile app-like experience
- ECU File Store (sell 80GB library of stock files)
- Refactor large components (NewUploadFlow.js, DTCDeletePage.js, CustomerPortal.js)

## Key Files
- `/app/frontend/src/pages/NewUploadFlow.js` - Main landing page (redesigned)
- `/app/backend/server.py` - Backend API logic
- `/app/frontend/src/pages/DTCDeletePage.js` - DTC removal tool
- `/app/frontend/src/pages/CustomerPortal.js` - User login/registration
- `/app/frontend/public/sitemap.xml` - SEO sitemap

## Credentials
- Customer Portal: `nikman.pp@gmail.com` / `password123`
- Admin Portal: `admin` / `ECUflash2024!`

## 3rd Party Integrations
- PayPal (react-paypal-js) - Live mode
- Hostinger Email (smtplib) - Transactional emails
- Google Analytics
- Google Search Console

## Architecture Notes
- File uploads stored as base64 in MongoDB for persistence
- Frontend uses REACT_APP_BACKEND_URL for API calls
- Backend prefixed with /api for Kubernetes routing
- All service prices are fetched dynamically from /api/services endpoint
