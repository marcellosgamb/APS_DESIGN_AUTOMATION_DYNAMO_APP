# Design Automation for Dynamo - Web App

A complete web application for running Dynamo scripts on Revit files using Autodesk Platform Services (APS) Design Automation. This app provides a user-friendly interface to automate Revit tasks in the cloud without needing Revit or Dynamo installed locally.
Based on logic from Sample file here 
https://github.com/DynamoDS/Dynamo_DesignAutomation and 
https://github.com/autodesk-platform-services/aps-simple-viewer-nodejs


## 🎯 What This App Does

- **Upload Revit files** and Dynamo scripts through a web interface
- **Execute Dynamo scripts** on Revit files in the cloud using APS Design Automation
- **Download processed results** including modified Revit files and execution reports
- **Real-time status updates** during processing
- **No local Revit installation required** - everything runs in the cloud

## ✅ Features

- Modern, step-by-step web interface
- Real-time WebSocket status updates
- Automatic Dynamo script to JSON conversion
- Support for built-in Dynamo nodes
- Python dependencies handling
- Optional custom packages support
- Download both modified Revit files and execution reports
- Comprehensive error logging and troubleshooting

## 🚀 Quick Start

### Prerequisites

1. **APS Developer Account**
   - Create an app at [APS Developer Portal](https://aps.autodesk.com)
   - Enable **Design Automation API** and **Data Management API**
   - Note your **Client ID** and **Client Secret**

2. **Development Environment**
   - [Node.js](https://nodejs.org/) (LTS version recommended)
   - [Visual Studio Code](https://code.visualstudio.com/) (optional but recommended)

### Installation

1. **Clone/Download** this repository
2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment** - Create `.env` file in root directory:
   ```env
   # APS Credentials (REQUIRED)
   APS_CLIENT_ID="your_client_id_here"
   APS_CLIENT_SECRET="your_client_secret_here"

   # Server Configuration
   PORT=8080

   # Bucket Configuration (customize these)
   APS_BUCKET_NAME="my_dynamo_bucket_123"    # Must be globally unique
   APS_BUCKET_REGION="US"
   APS_NICKNAME="my_nickname_123"            # Must be unique
   APS_BUNDLE_APP_NAME="my_dynamo_app_123"   # Must be unique
   APS_ACTIVITY_NAME="my_activity_123"       # Must be unique
   ```

4. **Start the application:**
   ```bash
   npm start
   ```

5. **Open browser** and navigate to: `http://localhost:8080`

## 📋 Step-by-Step Usage

### 1. Setup (One-time only)
1. **Get Access Token** - Authenticate with APS
2. **Set Nickname** - Register your developer nickname
3. **Upload AppBundle** - Upload the `DynamoRevitDA.zip` file
4. **Create Activity** - Define the cloud processing activity
5. **Create OSS Bucket** - Set up cloud storage

**Note:** If you need to start fresh or encounter issues, use the cleanup options:
- **Clear DA Resources** - Removes nickname, AppBundle, and Activity
- **Clear OSS Bucket** - Deletes the storage bucket and all files

### 2. Upload Files
1. **Python Dependencies** - Upload `pythonDependencies.zip`
2. **Revit File** - Upload your `.rvt` file (rename to `run.rvt`)
3. **Dynamo Script** - Upload your `.dyn` file (rename to `run.dyn`)
4. **Convert to JSON** - Convert Dynamo script to required format
5. **Upload JSON** - Upload the converted script to cloud storage
6. **Packages** (Optional) - Upload custom Dynamo packages if needed

### 3. Execute
- Click **Run Workitem** to process your files in the cloud
- Monitor real-time status updates
- Wait for completion (typically 1-3 minutes)

### 4. Download Results
- **Download Result Report (JSON)** - Execution details and outputs
- **Download Result Revit File** - Your modified Revit file

### 5. Cleanup (Optional)
- **Clear DA Resources** - Delete AppBundle, Activity, and Nickname when done
- **Clear OSS Bucket** - Remove storage bucket and all uploaded files

## 🔧 Technical Details

### Supported Dynamo Nodes
- ✅ **All built-in Dynamo nodes** (Geometry, Revit Elements, etc.)
- ✅ **Code blocks and basic logic**
- ✅ **IronPython scripts** (change engine from CPython3 to IronPython2)
- ⚠️ **Custom packages** (supported but requires packages.zip upload)
- ❌ **CPython3 scripts** (not supported in Design Automation environment)

### Engine Version
- Uses **Autodesk Revit 2026** engine
- Compatible with Revit files from 2024-2026
- Dynamo version 3.3+ supported

### File Requirements
- **Revit files:** Must be named `run.rvt`
- **Dynamo scripts:** Must be named `run.dyn`
- **File size limits:** 100MB for AppBundle, 2GB for input files
- **Supported formats:** .rvt, .dyn, .zip

## 🐛 Troubleshooting

### Common Issues and Solutions

**❌ "failedInstructions" Error**
- **Cause:** CPython3 nodes in Dynamo script
- **Solution:** Change Python nodes to IronPython2 or remove them

**❌ "Engine not available" Error**
- **Cause:** Engine version mismatch
- **Solution:** Ensure activity uses Revit 2026 engine

**❌ Workitem button disabled**
- **Cause:** Missing required files
- **Solution:** Upload both RVT and JSON files

**❌ Download buttons disabled**
- **Cause:** Workitem not completed successfully
- **Solution:** Check workitem status, re-run if needed

**❌ "Bucket already exists" Error**
- **Cause:** Bucket name not globally unique
- **Solution:** Change `APS_BUCKET_NAME` in `.env` file

### Debug Tips
1. **Check the output log** for detailed error messages
2. **Verify file names** are exactly `run.rvt` and `run.dyn`
3. **Test Dynamo script locally** in Dynamo for Revit first
4. **Use simple scripts** with only built-in nodes for testing
5. **Check bucket contents** in APS console if uploads fail

## 📁 Project Structure

```
new-dynamo-web-app/
├── public/                 # Frontend files
│   ├── index.html         # Main web interface
│   ├── js/main.js         # Frontend JavaScript
│   └── css/styles.css     # Styling
├── src/                   # Backend source code
│   ├── routes/            # API endpoints
│   │   ├── upload.js      # File upload & download
│   │   ├── workitem.js    # Workitem execution
│   │   ├── activity.js    # Activity management
│   │   └── ...
│   ├── services/          # APS API services
│   └── config.js          # Configuration
├── uploads/               # Temporary upload directory
├── .env                   # Environment variables (create this)
├── package.json           # Dependencies
└── server.js              # Main server file
```

## 🔑 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `APS_CLIENT_ID` | Your APS app client ID | `"abc123..."` |
| `APS_CLIENT_SECRET` | Your APS app client secret | `"xyz789..."` |
| `APS_BUCKET_NAME` | Unique bucket name | `"my_bucket_123"` |
| `APS_NICKNAME` | Your developer nickname | `"my_nickname"` |
| `APS_BUNDLE_APP_NAME` | AppBundle name | `"my_app_123"` |
| `APS_ACTIVITY_NAME` | Activity name | `"my_activity_123"` |

## 🎉 Success Story


## 📚 Additional Resources

- [APS Design Automation Documentation](https://aps.autodesk.com/en/docs/design-automation/v3/)
- [Dynamo for Revit Documentation](https://dynamobim.org/)
- [APS Developer Portal](https://aps.autodesk.com/)

## 📄 License

MIT License - see LICENSE file for details.

---

**🎯 Ready to automate your Revit workflows? Follow the setup steps above and start processing!** 