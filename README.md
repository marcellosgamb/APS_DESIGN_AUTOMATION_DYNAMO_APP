# 🚀 Dynamo Design Automation - Unified Web App

A complete educational web application for running Dynamo scripts on Revit files using Autodesk Platform Services (APS) Design Automation. This app features a **unified architecture** with individual educational modules and **live code viewing** capabilities.

## ✨ **What Makes This Special**

### 🎓 **Educational Focus**
- **Individual "📄 See Code" buttons** for every function - view the complete implementation instantly
- **Self-contained x.x.js files** - each button corresponds to a complete, runnable file
- **Unified server architecture** - simple approach that imports all handlers directly
- **No hardcoded values** - everything configurable via environment variables

### 🏗️ **Unified Architecture**
- **Single server.js** that imports all individual x.x.js handlers
- **No complex directory structures** - all logic files in root directory
- **Clean separation** - each API endpoint is a complete standalone file
- **Educational & production ready** - files can run individually or as unified system

## 🎯 **Core Features**

- ✅ **Upload Revit files** and Dynamo scripts through web interface
- ✅ **Execute Dynamo scripts** on Revit files in the cloud
- ✅ **Download processed results** - modified Revit files and execution reports
- ✅ **Real-time output logging** with timestamped messages
- ✅ **Source code viewing** - professional formatted code viewer
- ✅ **Complete workflow** - from setup to cleanup
- ✅ **No local Revit required** - everything runs in APS cloud

## 🏛️ **Architecture Overview**

```
Unified Server Architecture:
├── server.js              # Main unified server (imports all handlers)
├── start.js               # Simple server initialization
├── index.html             # Interface with "See Code" buttons
├── 0.1_clear_da_resources.js    # ⟵ Complete standalone file
├── 0.2_clear_oss_bucket.js      # ⟵ Complete standalone file  
├── 1.1_get_access_token.js      # ⟵ Complete standalone file
├── 1.2_get_nickname.js          # ⟵ Complete standalone file
├── ... (all 17 x.x.js files)   # ⟵ Each is complete & educational
├── .env                   # Environment configuration
└── package.json          # Clean dependencies
```

**Key Principle:** Each `x.x.js` file is a complete, self-contained implementation that can:
- ✅ Be imported as a handler by `server.js` (unified mode)
- ✅ Run independently as its own server (educational mode)  
- ✅ Be viewed as formatted source code via "📄 See Code" buttons

## 🚀 **Quick Start**

### Prerequisites
1. **APS Developer Account** - [Create app here](https://aps.autodesk.com)
   - Enable **Design Automation API** and **Data Management API**
   - Get your **Client ID** and **Client Secret**

2. **Node.js** - [Download LTS version](https://nodejs.org/)

### Installation

1. **Clone this repository:**
   ```bash
   git clone https://github.com/yourusername/dynamo-design-automation-unified
   cd dynamo-design-automation-unified
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
1. **Python Dependencies** - Upload `pythonDependencies.zip`
2. **Revit File** - Upload your `.rvt` file
3. **Dynamo Script** - Upload your `.dyn` file  
4. **Convert to JSON** - Convert Dynamo script to required format
5. **Upload JSON** - Upload converted script to bucket
6. **Packages** (Optional) - Upload custom Dynamo packages if needed

### ▶️ **Step 3: Execute**
- **Run Workitem** - Process your files in the cloud
- Monitor real-time progress in output log
- Wait for completion (typically 1-3 minutes)

### 📥 **Step 4: Download Results**
- **Download Result JSON** - Execution report with captured outputs
- **Download Result RVT** - Your modified Revit file

## 💡 **Educational Features**

### 📄 **"See Code" Buttons**
Every function has a **"📄 See Code"** button that opens a formatted view of the complete implementation:

- **Professional formatting** with syntax highlighting
- **Complete context** - see the entire file, not just snippets
- **Educational headers** explaining what each file does
- **New window** - doesn't interrupt your workflow

### 🎓 **Self-Contained Files**
Each `x.x.js` file is educational and production-ready:

```javascript
// Example: 1.1_get_access_token.js
// - Complete token management logic
// - Error handling and logging  
// - Export handler for unified server
// - Standalone server mode for learning
// - Educational comments throughout
```

### 🔧 **Dual-Mode Architecture**
```javascript
// Each file can operate in two modes:

// 1. UNIFIED MODE (production)
const handler = require('./1.1_get_access_token.js');
server.post('/get-access-token', handler);

// 2. EDUCATIONAL MODE (learning)  
node 1.1_get_access_token.js  // Runs its own server!
```

## 🔧 **Technical Specifications**

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

### Environment Requirements
- **Node.js:** LTS version recommended
- **Dependencies:** Express, Axios, Multer, dotenv (minimal set)
- **No database required**
- **No complex frameworks** - pure Node.js + Express

## 🐛 **Troubleshooting**

### Common Issues

**❌ Activity not found (e.g., `my_nicknamew.my_activity_1new+default`)**
- **Cause:** Environment variables not loading correctly
- **Solution:** Ensure `.env` file exists and values match `env.txt`

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
- **Real-time logging** with timestamps in output window
- **Detailed error messages** with operation context
- **Environment variable debugging** in workitem execution
- **Network request/response logging**

## 📁 **File Structure**

```
dynamo-design-automation-unified/
├── 📄 Individual Function Files
│   ├── 0.1_clear_da_resources.js     # Clear Design Automation resources
│   ├── 0.2_clear_oss_bucket.js       # Clear OSS bucket
│   ├── 1.1_get_access_token.js       # APS authentication
│   ├── 1.2_get_nickname.js           # Get DA nickname
│   ├── 1.3_set_nickname.js           # Set DA nickname  
│   ├── 1.5_upload_appbundle.js       # Upload Dynamo engine
│   ├── 1.6_create_activity.js        # Create DA activity
│   ├── 1.7_create_oss_bucket.js      # Create storage bucket
│   ├── 2.1_upload_revit_file.js      # Upload RVT file
│   ├── 2.2_upload_dynamo_file.js     # Upload DYN file
│   ├── 2.3_convert_dynamo_to_json.js # Convert DYN to JSON
│   ├── 2.4_upload_json_file.js       # Upload JSON to bucket
│   ├── 2.5_upload_python_dependencies.js # Upload Python deps
│   ├── 2.6_upload_packages.js        # Upload custom packages
│   ├── 3.1_run_workitem.js           # Execute in cloud
│   ├── 4.1_download_result_json.js   # Download JSON results
│   └── 4.2_download_result_rvt.js    # Download RVT results
├── 🏗️ Architecture Files  
│   ├── server.js                     # Unified server (imports all handlers)
│   ├── start.js                      # Server initialization
│   ├── index.html                    # Web interface with "See Code" buttons
│   └── package.json                  # Clean dependencies
├── 📋 Configuration
│   ├── .env                          # Environment variables (create this)
│   ├── env.txt                       # Example environment file (visible)
│   └── .gitignore                    # Git ignore rules
├── 📦 Required Files
│   ├── DynamoRevitDA.zip            # Dynamo engine for cloud
│   ├── pythonDependencies.zip       # Python libraries
│   ├── run.dyn                      # Example Dynamo script
│   └── run.rvt                      # Example Revit file
└── 📚 Documentation
    ├── README.md                    # This file
    └── BUTTON_EXPLAINERS/           # Text explanations for each function
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
- **File upload:** ~30-60 seconds depending on size
- **Execution time:** 1-5 minutes depending on script complexity
- **Download time:** ~10-30 seconds

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
- [Dynamo Design Automation GitHub](https://github.com/DynamoDS/Dynamo_DesignAutomation)

## 📄 **License**

MIT License - Feel free to use, modify, and distribute for educational and commercial purposes.

---

## 🚀 **Ready to Get Started?**

1. **Clone this repository**
2. **Create your `.env` file**  
3. **Run `npm install && npm start`**
4. **Click the "📄 See Code" buttons to learn!**

**Happy automating! 🎉** 