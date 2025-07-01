# 🚀 Dynamo Design Automation - Complete Web Application

A production-ready web application for running Dynamo scripts on Revit files using Autodesk Platform Services (APS) Design Automation. This app features a **unified architecture** with individual educational modules and **real-time status updates**.

## ✨ **What Makes This Special**

### 🎓 **Educational Focus**
- **Individual "📄 See Code" buttons** for every function - view the complete implementation instantly
- **Self-contained x.x.js files** - each function is a complete, runnable module
- **Unified server architecture** - simple approach that imports all handlers directly
- **Real-time updates** - Socket.IO powered status logging with timestamps

### 🏗️ **Modern Architecture**
- **Single server.js** that imports all individual x.x.js handlers
- **Unified upload endpoint** with signed URLs for secure file transfer
- **Clean separation** - each API endpoint is a complete standalone file
- **Socket.IO integration** - real-time progress updates and error handling
- **Production ready** - all files use modern async/await and proper error handling

## 🎯 **Core Features**

- ✅ **Upload Revit files** and Dynamo scripts through web interface
- ✅ **Execute Dynamo scripts** on Revit files in the cloud  
- ✅ **Download processed results** - modified Revit files and execution reports
- ✅ **Real-time progress tracking** with Socket.IO updates
- ✅ **Signed URL uploads** - secure, modern file transfer approach
- ✅ **Source code viewing** - professional formatted code viewer
- ✅ **Complete workflow** - from setup to cleanup
- ✅ **No local Revit required** - everything runs in APS cloud

## 🏛️ **Architecture Overview**

```
Production Architecture:
├── server.js              # Main unified server (Socket.IO + all handlers)
├── start.js               # Server initialization with Socket.IO
├── index.html             # Modern interface with real-time updates
├── 0.1_clear_da_resources.js    # ⟵ Complete standalone module
├── 0.2_clear_oss_bucket.js      # ⟵ Complete standalone module
├── 1.1_get_access_token.js      # ⟵ Complete standalone module
├── 1.2_get_nickname.js          # ⟵ Complete standalone module
├── ... (all 17 x.x.js files)   # ⟵ Each is complete & educational
├── .env                   # Environment configuration
└── package.json          # Dependencies (includes fs-extra for file handling)
```

**Key Features:**
- ✅ **Unified upload endpoint** - `/api/aps/upload/single` handles all file types
- ✅ **Signed URLs:** Secure, modern approach (no legacy endpoints)
- ✅ **Socket.IO integration** - real-time status updates during operations
- ✅ **Proper file handling** - fs-extra for robust async file operations
- ✅ **Download fixes** - proper signed download URLs for all result files

## 🚀 **Quick Start**

### Prerequisites
1. **APS Developer Account** - [Create app here](https://aps.autodesk.com)
   - Enable **Design Automation API** and **Data Management API**
   - Get your **Client ID** and **Client Secret**

2. **Node.js** - [Download LTS version](https://nodejs.org/)

### Installation

1. **Clone this repository:**
   ```bash
   git clone https://github.com/yourusername/dynamo-design-automation
   cd dynamo-design-automation
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file** in root directory:
   ```env
   # APS Credentials (REQUIRED)
   APS_CLIENT_ID=your_client_id_here
   APS_CLIENT_SECRET=your_client_secret_here

   # Server Configuration  
   PORT=8080

   # File Handling (don't change these)
   APS_BUNDLE_FILE=DynamoRevitDA.zip
   APS_PYTHON_FILE=pythonDependencies.zip
   APS_DYN_FILE=run.dyn
   APS_PACKAGES_FILE=packages.zip
   APS_RUN_REQ_FILE=run.json
   APS_RESULT_FILE=result.json
   APS_RVT_RESULT_FILE=result.rvt

   # Customizable Values (must be globally unique)
   APS_BUCKET_NAME=my_dynamo_bucket_123
   APS_BUCKET_REGION=US
   APS_BUNDLE_APP_NAME=my_dynamo_app_123
   APS_NICKNAME=my_nickname_123
   APS_ACTIVITY_NAME=my_activity_123
   ```

4. **Start the application:**
   ```bash
   npm start
   ```

5. **Open browser:** `http://localhost:8080`

## 📋 **Complete Workflow**

### 🔧 **Step 0: Cleanup (Optional)**
Start fresh by removing any existing resources:
- **Clear DA Resources** - Removes nickname, AppBundle, Activity
- **Clear OSS Bucket** - Deletes storage bucket and files

### 🏗️ **Step 1: Setup (One-time)**
1. **Get Access Token** - Authenticate with APS
2. **Get/Set Nickname** - Register your developer identity
3. **Upload AppBundle** - Upload `DynamoRevitDA.zip` (contains Dynamo engine)
4. **Create Activity** - Define the cloud processing workflow
5. **Create OSS Bucket** - Set up cloud file storage

### 📁 **Step 2: Upload Files**
1. **Python Dependencies** - Upload `pythonDependencies.zip` via unified endpoint
2. **Revit File** - Upload your `.rvt` file with signed URLs
3. **Dynamo Script** - Upload your `.dyn` file with validation
4. **Convert to JSON** - Convert Dynamo script to required format
5. **Upload JSON** - Upload converted script using signed URLs
6. **Packages** (Optional) - Upload custom Dynamo packages if needed

### ▶️ **Step 3: Execute**
- **Run Workitem** - Process your files in the cloud
- **Real-time monitoring** - Socket.IO updates in output log
- **Progress tracking** - See each step as it happens
- Wait for completion (typically 1-3 minutes)

### 📥 **Step 4: Download Results**
- **Download Result JSON** - Execution report with captured outputs (proper file download)
- **Download Result RVT** - Your modified Revit file (fixed download URLs)

## 💡 **Technical Improvements**

### 🔄 **Modern Upload System**
- **Unified endpoint:** `/api/aps/upload/single` handles all file types
- **Signed URLs:** Secure, modern approach (no legacy endpoints)
- **Real-time feedback:** Socket.IO updates during upload process
- **Error handling:** Comprehensive error reporting with details

### 📡 **Socket.IO Integration**
Every operation provides real-time updates:
```javascript
// Client automatically receives status updates
socket.on('status', (data) => {
    console.log(data.message); // Real-time progress
});
```

### 📄 **"See Code" Buttons**
Every function has a **"📄 See Code"** button that opens a formatted view:
- **Professional formatting** with syntax highlighting
- **Complete context** - see the entire file implementation
- **Educational headers** explaining each module's purpose
- **New window** - doesn't interrupt your workflow

### 🎓 **Self-Contained Modules**
Each `x.x.js` file is educational and production-ready:
```javascript
// Example: 2.4_upload_json_file.js
// - Modern signed URL approach
// - Socket.IO status updates
// - Complete error handling
// - Export handler for unified server
// - Standalone capability for learning
```

## 🔧 **Technical Specifications**

### Modern Dependencies
- **Express.js** - Web server framework
- **Socket.IO** - Real-time communication
- **fs-extra** - Enhanced file system operations
- **Axios** - HTTP client for APS API calls
- **Multer** - File upload handling
- **dotenv** - Environment configuration

### Supported Dynamo Features
- ✅ **All built-in Dynamo nodes** (Geometry, Revit Elements, Lists, etc.)
- ✅ **IronPython scripts** (change from CPython3 to IronPython2)
- ✅ **Custom packages** (upload as packages.zip)
- ❌ **CPython3 scripts** (not supported in DA environment)

### Engine & Compatibility  
- **Engine:** Autodesk Revit 2026
- **Revit Files:** 2024-2026 compatible
- **Dynamo Version:** 3.3+
- **File Limits:** 100MB AppBundle, 2GB input files

### API Endpoints
```
Unified Modern Architecture:
├── /api/aps/upload/single        # Unified upload (all file types)
├── /api/aps/download/result-json # Download with signed URLs
├── /api/aps/download/result-rvt  # Download with signed URLs  
├── /api/aps/workitem            # Execute with real-time updates
└── All other endpoints...        # Complete API coverage
```

## 🐛 **Troubleshooting**

### Fixed Issues (No Longer Occur)
- ✅ **"Legacy endpoint is deprecated"** - Fixed with signed URL uploads
- ✅ **Download 403 errors** - Fixed with proper signed download URLs
- ✅ **File upload callback errors** - Fixed with fs-extra dependency
- ✅ **JSON upload failures** - Fixed with unified upload endpoint

### Common Issues

**❌ Activity not found (e.g., `my_nicknamew.my_activity_1new+default`)**
- **Cause:** Environment variables not loading correctly
- **Solution:** Ensure `.env` file exists and values are unique

**❌ "failedInstructions" Error**
- **Cause:** CPython3 nodes in Dynamo script
- **Solution:** Change Python nodes to IronPython2

**❌ "Bucket already exists" Error**  
- **Cause:** Bucket name not globally unique
- **Solution:** Change `APS_BUCKET_NAME` in `.env` file

**❌ Source code not displaying**
- **Cause:** File not found or server not running
- **Solution:** Ensure server is running and file exists

### Debug Features
- **Real-time logging** with timestamps via Socket.IO
- **Detailed error messages** with operation context
- **Environment variable debugging** in workitem execution
- **Network request/response logging**

## 📁 **File Structure**

```
dynamo-design-automation/
├── 📄 Core Application Files
│   ├── 0.1_clear_da_resources.js     # Clear Design Automation resources
│   ├── 0.2_clear_oss_bucket.js       # Clear OSS bucket
│   ├── 1.1_get_access_token.js       # APS authentication
│   ├── 1.2_get_nickname.js           # Get DA nickname
│   ├── 1.3_set_nickname.js           # Set DA nickname  
│   ├── 1.5_upload_appbundle.js       # Upload Dynamo engine
│   ├── 1.6_create_activity.js        # Create DA activity
│   ├── 1.7_create_oss_bucket.js      # Create storage bucket
│   ├── 2.1_upload_revit_file.js      # Upload RVT file (signed URLs)
│   ├── 2.2_upload_dynamo_file.js     # Upload DYN file (signed URLs)
│   ├── 2.3_convert_dynamo_to_json.js # Convert DYN to JSON
│   ├── 2.4_upload_json_file.js       # Upload JSON (signed URLs)
│   ├── 2.5_upload_python_dependencies.js # Upload Python deps
│   ├── 2.6_upload_packages.js        # Upload custom packages
│   ├── 3.1_run_workitem.js           # Execute with Socket.IO updates
│   ├── 4.1_download_result_json.js   # Download JSON (fixed URLs)
│   └── 4.2_download_result_rvt.js    # Download RVT (fixed URLs)
├── 🏗️ Architecture Files  
│   ├── server.js                     # Unified server with Socket.IO
│   ├── start.js                      # Server initialization
│   ├── index.html                    # Modern interface with real-time updates
│   └── package.json                  # Dependencies (includes fs-extra)
├── 📋 Configuration
│   ├── .env                          # Environment variables (create this)
│   ├── env.txt                       # Example environment file
│   └── .gitignore                    # Git ignore rules
├── 📦 Required Files
│   ├── DynamoRevitDA.zip            # Dynamo engine for cloud
│   ├── pythonDependencies.zip       # Python libraries
│   ├── run.dyn                      # Example Dynamo script
│   └── run.rvt                      # Example Revit file
├── 🎨 Frontend Assets
│   └── css/
│       └── styles.css               # Application styling
└── 📁 Temporary Files
    └── uploads/                     # Temporary upload storage (auto-created)
```

## 🔑 **Environment Variables Reference**

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `APS_CLIENT_ID` | ✅ | Your APS app client ID | `abc123def456...` |
| `APS_CLIENT_SECRET` | ✅ | Your APS app client secret | `xyz789uvw012...` |
| `PORT` | ✅ | Server port number | `8080` |
| `APS_BUCKET_NAME` | ✅ | Globally unique bucket name | `my_bucket_456` |
| `APS_NICKNAME` | ✅ | Your unique DA nickname | `my_nick_789` |
| `APS_BUNDLE_APP_NAME` | ✅ | Unique AppBundle name | `my_app_012` |  
| `APS_ACTIVITY_NAME` | ✅ | Unique Activity name | `my_activity_345` |
| `APS_BUCKET_REGION` | ✅ | Bucket region | `US` |

## 🎉 **Success Examples**

### Typical Use Cases
- **Automate Revit model updates** - Update families, parameters, views
- **Generate reports** - Extract model data, create schedules
- **Quality checks** - Validate model standards, check compliance  
- **Batch processing** - Process multiple models with same script
- **Custom workflows** - Implement company-specific automation

### Performance
- **Setup time:** ~2-3 minutes (one-time)
- **File upload:** ~30-60 seconds (with real-time progress)
- **Execution time:** 1-5 minutes (with Socket.IO updates)
- **Download time:** ~10-30 seconds (fixed download system)

## 🔄 **Recent Improvements**

### v1.0 Production Release
- ✅ **Fixed JSON uploads** - Now uses signed URLs instead of deprecated endpoints
- ✅ **Fixed file downloads** - Proper signed download URLs for all result files
- ✅ **Added Socket.IO** - Real-time progress updates for all operations
- ✅ **Unified upload system** - Single endpoint handles all file types securely
- ✅ **Enhanced error handling** - Better error messages and debugging
- ✅ **Modern file handling** - fs-extra dependency for robust file operations

## 🤝 **Contributing**

This project is designed for **education and customization**:

1. **Fork the repository**
2. **Add your own x.x.js files** following the same pattern
3. **Update server.js** to include your new handlers
4. **Add "See Code" buttons** in index.html
5. **Test both unified and individual modes**
6. **Share your improvements!**

## 📚 **Additional Resources**

- [APS Design Automation Documentation](https://aps.autodesk.com/en/docs/design-automation/v3/)
- [Dynamo Documentation](https://dynamobim.org/)
- [APS Developer Portal](https://aps.autodesk.com/)
- [Socket.IO Documentation](https://socket.io/docs/)

## 📄 **License**

MIT License - Feel free to use, modify, and distribute for educational and commercial purposes.

---

## 🚀 **Ready to Get Started?**

1. **Clone this repository**
2. **Create your `.env` file** with unique values  
3. **Run `npm install && npm start`**
4. **Watch real-time updates** as you process your files!
5. **Click "📄 See Code" buttons** to learn the implementation!

**Happy automating! 🎉** 