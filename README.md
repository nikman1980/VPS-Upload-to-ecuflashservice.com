# DPF AdBlue Removal Service Application

A professional full-stack web application for managing DPF (Diesel Particulate Filter) and AdBlue removal service requests.

## 🚀 Features

### Customer-Facing Features
- **Professional Landing Page**: Modern hero section with service information
- **Service Catalog**: Four comprehensive automotive services:
  - DPF Removal
  - AdBlue/DEF System Removal
  - EGR Removal
  - ECU Remapping
- **Service Request Form**: Complete form to collect:
  - Customer information (name, email, phone)
  - Vehicle details (make, model, year, engine type, VIN, mileage)
  - Multiple service selection
  - Issues description and additional notes
- **Request Confirmation**: Success page with request ID and details

### Admin Features
- **Admin Dashboard**: Comprehensive view of all service requests
- **Statistics**: Real-time counts of total, pending, in-progress, and completed requests
- **Request Management**: 
  - View all requests in table format
  - Detailed request information modal
  - Status updates (Pending → In Progress → Completed/Cancelled)
  - Color-coded status badges

## 🛠 Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React 19
- **Database**: MongoDB
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI

## 📁 Project Structure

```
/app/
├── backend/
│   ├── server.py          # FastAPI application with all endpoints
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Environment variables
├── frontend/
│   ├── src/
│   │   ├── App.js        # Main React app with routing
│   │   ├── pages/
│   │   │   ├── HomePage.js           # Landing page with service form
│   │   │   ├── AdminPage.js          # Admin dashboard
│   │   │   └── RequestSuccessPage.js # Success confirmation
│   │   ├── App.css       # Global styles
│   │   └── index.css     # Tailwind configuration
│   ├── package.json      # Node dependencies
│   └── .env             # Frontend environment variables
└── README.md

```

## 🔌 API Endpoints

### Services
- `GET /api/services` - Get all available services

### Service Requests
- `POST /api/service-requests` - Create a new service request
- `GET /api/service-requests` - Get all service requests (Admin)
- `GET /api/service-requests/{id}` - Get specific request by ID
- `PATCH /api/service-requests/{id}/status` - Update request status

## 🗃️ Data Models

### ServiceRequest
```javascript
{
  id: string (UUID),
  customer_name: string,
  customer_email: string,
  customer_phone: string,
  vehicle_make: string,
  vehicle_model: string,
  vehicle_year: integer,
  engine_type: string,
  vin: string (optional),
  mileage: integer,
  selected_services: array of strings,
  issues_description: string (optional),
  additional_notes: string (optional),
  status: enum ['pending', 'in_progress', 'completed', 'cancelled'],
  created_at: datetime,
  updated_at: datetime
}
```

## 🚦 Status Flow

1. **Pending** - Initial status when request is created
2. **In Progress** - Request is being worked on
3. **Completed** - Service completed successfully
4. **Cancelled** - Request cancelled

## 🌐 Routes

- `/` - Home page with service information and request form
- `/admin` - Admin dashboard to manage requests
- `/success/{requestId}` - Request confirmation page

## 🎨 Design Features

- Modern dark theme with gradient backgrounds
- Responsive design for all screen sizes
- Smooth animations and transitions
- Color-coded status indicators
- Professional typography and spacing
- Accessibility features with data-testid attributes

## 📝 Usage

### For Customers:
1. Visit the home page
2. Click "Get a Free Quote"
3. Fill out the service request form
4. Select desired services
5. Submit and receive confirmation with request ID

### For Administrators:
1. Navigate to `/admin`
2. View all service requests in the dashboard
3. Check statistics (pending, in progress, completed)
4. Click "View Details" on any request
5. Update status using the dropdown
6. View complete customer and vehicle information

## 🔒 Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
CORS_ORIGINS=*
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=https://engine-remap-2.preview.emergentagent.com
```

## ✅ Testing

The application has been tested with:
- All API endpoints verified with CURL
- End-to-end form submission flow
- Admin dashboard functionality
- Status updates
- Data persistence in MongoDB
- Screenshot testing with Playwright

## 🎯 Key Features Implemented

✅ Full customer service request workflow
✅ Admin dashboard with real-time statistics
✅ MongoDB integration with UUID-based IDs
✅ Status management system
✅ Responsive design with Tailwind CSS
✅ Form validation
✅ Error handling
✅ Professional UI/UX
✅ All data-testid attributes for testing

## 🚀 Services Offered

1. **DPF Removal** - Complete diesel particulate filter removal and ECU remapping
2. **AdBlue/DEF Removal** - Remove AdBlue system and reprogram ECU
3. **EGR Removal** - Exhaust Gas Recirculation system removal
4. **ECU Remapping** - Professional ECU tuning for improved performance
