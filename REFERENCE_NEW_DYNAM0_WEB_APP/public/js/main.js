document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const dynamoRevitDAFileInput = document.getElementById('dynamoRevitDAFile');
    const pythonFileInput = document.getElementById('pythonFile');
    const rvtFileInput = document.getElementById('rvtFile');
    const dynFileInput = document.getElementById('dynFile');
    const jsonContentTextarea = document.getElementById('jsonContent');
    const packagesFileInput = document.getElementById('packagesFile');
    const outputLog = document.getElementById('outputLog');

    // Setup Buttons
    const btnGetToken = document.getElementById('btnGetToken');
    const btnGetNickname = document.getElementById('btnGetNickname');
    const btnSetNickname = document.getElementById('btnSetNickname');
    const btnAppBundle = document.getElementById('btnAppBundle');
    const btnActivity = document.getElementById('btnActivity');
    const btnCreateBucket = document.getElementById('btnCreateBucket');

    // Upload Buttons
    const btnUploadPython = document.getElementById('btnUploadPython');
    const btnUploadRvt = document.getElementById('btnUploadRvt');
    const btnUploadDyn = document.getElementById('btnUploadDyn');
    const btnConvertDynToJson = document.getElementById('btnConvertDynToJson');
    const btnUploadJson = document.getElementById('btnUploadJson');
    const btnUploadPackages = document.getElementById('btnUploadPackages');

    // Execute Button
    const btnWorkitem = document.getElementById('btnWorkitem');

    // Download Buttons
    const btnDownloadResultJson = document.getElementById('btnDownloadResultJson');
    const btnDownloadResultRvt = document.getElementById('btnDownloadResultRvt');

    // Viewer Buttons
    const btnViewUploadedModel = document.getElementById('btnViewUploadedModel');
    const btnViewResultModel = document.getElementById('btnViewResultModel');

    // Cleanup Buttons
    const btnClearDa = document.getElementById('btnClearDa');
    const btnClearBucket = document.getElementById('btnClearBucket');

    const allButtons = [
        btnGetToken, btnGetNickname, btnSetNickname, btnAppBundle, btnActivity, btnCreateBucket,
        btnUploadPython, btnUploadRvt, btnUploadDyn, btnConvertDynToJson, btnUploadJson, btnUploadPackages,
        btnWorkitem, btnClearDa, btnClearBucket
    ];
    
    let socketId = null;
    let uploadedFiles = {
        python: false,
        rvt: null,
        rvtUrn: null,  // Store URN for viewer
        resultUrn: null,  // Store URN for result.rvt viewer
        dynamo: false,
        json: false,
        packages: false
    };

    // --- Socket.IO Setup ---
    const socket = io();
    socket.on('connect', () => {
        logMessage('Connected to server.');
    });
    socket.on('socketId', (id) => {
        socketId = id;
        logMessage(`Client registered with socket ID: ${socketId}`);
    });
    socket.on('status', (data) => logMessage(data.message));
    socket.on('result', (data) => {
        logMessage('Workitem finished successfully.');
        logMessage(`Dynamo Result: <a href="${data.json}" target="_blank">Download</a>`);
        // Enable download buttons after successful workitem
        btnDownloadResultJson.disabled = false;
        btnDownloadResultRvt.disabled = false;
        enableAllButtons(false);
    });
    socket.on('error', (data) => {
        logMessage(`--- ERROR ---<br/>${data.error}`);
        enableAllButtons(false);
    });
    socket.on('disconnect', () => logMessage('Disconnected from server.'));

    // --- Setup Button Event Handlers ---
    btnGetToken.addEventListener('click', (e) => postData('/api/aps/token', {}, 'Fetching access token...', e.currentTarget));
    btnGetNickname.addEventListener('click', (e) => getNickname(e.currentTarget));
    btnSetNickname.addEventListener('click', (e) => postData('/api/aps/nickname', {}, 'Setting Nickname...', e.currentTarget));
    btnAppBundle.addEventListener('click', (e) => {
        if (!dynamoRevitDAFileInput.files[0]) {
            return logMessage('Please select an AppBundle ZIP file first (step 4).');
        }
        uploadAppBundle(e.currentTarget);
    });
    btnActivity.addEventListener('click', (e) => postData('/api/aps/activity', {}, 'Creating Activity...', e.currentTarget));
    btnCreateBucket.addEventListener('click', (e) => postData('/api/aps/bucket', {}, 'Creating OSS Bucket...', e.currentTarget));

    // --- Upload Button Event Handlers ---
    btnUploadPython.addEventListener('click', (e) => {
        if (!pythonFileInput.files[0]) {
            return logMessage('Please select a Python dependencies ZIP file.');
        }
        uploadSingleFile('python', pythonFileInput.files[0], e.currentTarget);
    });

    btnUploadRvt.addEventListener('click', (e) => {
        if (!rvtFileInput.files[0]) {
            return logMessage('Please select a Revit file.');
        }
        uploadSingleFile('rvt', rvtFileInput.files[0], e.currentTarget);
    });

    btnUploadDyn.addEventListener('click', (e) => {
        if (!dynFileInput.files[0]) {
            return logMessage('Please select a Dynamo file.');
        }
        uploadSingleFile('dynamo', dynFileInput.files[0], e.currentTarget);
    });

    btnConvertDynToJson.addEventListener('click', (e) => {
        logMessage('Convert button clicked!'); // Debug message
        if (!dynFileInput.files[0]) {
            return logMessage('Please select a Dynamo file first.');
        }
        if (!socketId) {
            return logMessage('Not connected to server. Please refresh the page.');
        }
        convertDynamoToJson(e.currentTarget);
    });

    btnUploadJson.addEventListener('click', (e) => {
        if (!jsonContentTextarea.value.trim()) {
            return logMessage('No JSON content to upload. Please convert a Dynamo file first.');
        }
        uploadJsonContent(e.currentTarget);
    });

    btnUploadPackages.addEventListener('click', (e) => {
        if (!packagesFileInput.files[0]) {
            return logMessage('Please select a packages ZIP file.');
        }
        uploadSingleFile('packages', packagesFileInput.files[0], e.currentTarget);
    });

    // --- Execute Button ---
    btnWorkitem.addEventListener('click', (e) => {
        if (!uploadedFiles.rvt) {
            return logMessage('Error: No RVT file has been uploaded.');
        }
        if (!uploadedFiles.json) {
            return logMessage('Error: No JSON file has been uploaded.');
        }
        const body = { 
            socketId, 
            rvtFileName: uploadedFiles.rvt,
            hasPackages: !!uploadedFiles.packages  // Convert to boolean
        };
        postData('/api/aps/workitem', body, 'Starting workitem...', e.currentTarget);
    });

    // --- Download Button Event Handlers ---
    btnDownloadResultJson.addEventListener('click', (e) => downloadFile('result-json', e.currentTarget));
    btnDownloadResultRvt.addEventListener('click', (e) => downloadFile('result-rvt', e.currentTarget));

    // --- Viewer Button Event Handlers ---
    btnViewUploadedModel.addEventListener('click', (e) => {
        if (!uploadedFiles.rvtUrn) {
            return logMessage('No RVT file URN available. Please upload a Revit file first.');
        }
        openViewerWindow(uploadedFiles.rvtUrn, 'Original Model (Before)');
        logMessage('Opening original model in new viewer window...');
    });

    btnViewResultModel.addEventListener('click', (e) => {
        if (!uploadedFiles.resultUrn) {
            return logMessage('No result model URN available. Please run workitem first.');
        }
        openViewerWindow(uploadedFiles.resultUrn, 'Result Model (After)');
        logMessage('Opening result model in new viewer window...');
    });

    // --- Cleanup Button Event Handlers ---
    btnClearDa.addEventListener('click', (e) => {
        if (!confirm('Are you sure you want to delete your Nickname and ALL AppBundles & Activities?')) return;
        deleteData('/api/aps/account', 'Clearing DA Resources...', e.currentTarget);
    });
    btnClearBucket.addEventListener('click', (e) => {
        if (!confirm('Are you sure you want to delete your OSS Bucket?')) return;
        deleteData('/api/aps/bucket', 'Clearing OSS Bucket...', e.currentTarget);
    });

    // --- Helper Functions ---
    async function getNickname(clickedButton) {
        clearLogAndDisableButtons('Getting nickname...', clickedButton);
        try {
            const response = await fetch('/api/aps/nickname');
            const data = await response.json();
            logMessage(`--- RESPONSE (Status: ${response.status}) ---`);
            logMessage(`<pre>${JSON.stringify(data, null, 2)}</pre>`);
        } catch (err) {
            logMessage(`--- ERROR ---<br/>${err.message}`);
        } finally {
            enableAllButtons(false);
        }
    }

    async function uploadSingleFile(fileType, file, clickedButton) {
        clearLogAndDisableButtons(`Uploading ${fileType} file...`, clickedButton);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('fileType', fileType);
            formData.append('socketId', socketId);
            
            const response = await fetch('/api/aps/upload/single', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            logMessage(`--- RESPONSE (Status: ${response.status}) ---`);
            logMessage(`<pre>${JSON.stringify(data, null, 2)}</pre>`);
            
            if (!response.ok) throw new Error(`Request failed, see details above.`);
            
            // Mark file as uploaded
            if (fileType === 'rvt') {
                uploadedFiles.rvt = data.fileName;
                uploadedFiles.rvtUrn = data.urn;
                // Enable the viewer button
                btnViewUploadedModel.disabled = false;
                logMessage(`RVT file uploaded with URN: ${data.urn}`);
            } else {
                uploadedFiles[fileType] = true;
            }
            
            updateWorkitemButtonState();
            
        } catch (error) {
            logMessage(error.message);
        } finally {
            enableAllButtons(false);
        }
    }

    async function convertDynamoToJson(clickedButton) {
        clearLogAndDisableButtons('Converting Dynamo to JSON...', clickedButton);
        try {
            logMessage(`Debug: Converting file ${dynFileInput.files[0].name} with socketId ${socketId}`);
            
            const formData = new FormData();
            formData.append('dynFile', dynFileInput.files[0]);
            formData.append('socketId', socketId);
            formData.append('showContent', 'true'); // Request to return JSON content
            
            const response = await fetch('/api/aps/upload/dyn-to-json-preview', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            logMessage(`--- RESPONSE (Status: ${response.status}) ---`);
            logMessage(`<pre>${JSON.stringify(data, null, 2)}</pre>`);
            
            if (!response.ok) throw new Error(`Request failed, see details above.`);
            
            // Show JSON content in textarea
            if (data.jsonContent) {
                jsonContentTextarea.value = data.jsonContent;
                btnUploadJson.disabled = false; // Enable upload button
                logMessage('JSON content generated and displayed. You can now upload it.');
            }
            
        } catch (error) {
            logMessage(error.message);
        } finally {
            enableAllButtons(false);
        }
    }

    async function uploadAppBundle(clickedButton) {
        clearLogAndDisableButtons('Creating AppBundle...', clickedButton);
        try {
            const formData = new FormData();
            formData.append('appBundleFile', dynamoRevitDAFileInput.files[0]);
            formData.append('socketId', socketId);
            
            const response = await fetch('/api/aps/appbundle', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            logMessage(`--- RESPONSE (Status: ${response.status}) ---`);
            logMessage(`<pre>${JSON.stringify(data, null, 2)}</pre>`);
            
            if (!response.ok) throw new Error(`Request failed, see details above.`);
            
        } catch (error) {
            logMessage(error.message);
        } finally {
            enableAllButtons(false);
        }
    }

    async function uploadJsonContent(clickedButton) {
        clearLogAndDisableButtons('Uploading JSON content...', clickedButton);
        try {
            const jsonContent = jsonContentTextarea.value.trim();
            
            const response = await fetch('/api/aps/upload/json-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    jsonContent: jsonContent,
                    socketId: socketId 
                })
            });
            const data = await response.json();
            logMessage(`--- RESPONSE (Status: ${response.status}) ---`);
            logMessage(`<pre>${JSON.stringify(data, null, 2)}</pre>`);
            
            if (!response.ok) throw new Error(`Request failed, see details above.`);
            
            // Mark JSON as uploaded
            uploadedFiles.json = true;
            updateWorkitemButtonState();
            
        } catch (error) {
            logMessage(error.message);
        } finally {
            enableAllButtons(false);
        }
    }

    async function downloadFile(fileType, clickedButton) {
        clearLogAndDisableButtons(`Generating download URL for ${fileType}...`, clickedButton);
        try {
            const response = await fetch(`/api/aps/upload/download/${fileType}`);
            const data = await response.json();
            logMessage(`--- RESPONSE (Status: ${response.status}) ---`);
            logMessage(`<pre>${JSON.stringify(data, null, 2)}</pre>`);
            
            if (!response.ok) throw new Error(`Request failed, see details above.`);
            
            // For result.json, also fetch and display the parsed outputs
            if (fileType === 'result-json' && data.downloadUrl) {
                try {
                    const resultResponse = await fetch(data.downloadUrl);
                    const resultData = await resultResponse.json();
                    displayDynamoOutputs(resultData);
                } catch (err) {
                    logMessage(`Could not parse result.json for display: ${err.message}`);
                }
            }
            
            // Open download URL in new tab
            if (data.downloadUrl) {
                logMessage(`<a href="${data.downloadUrl}" target="_blank" download="${data.fileName}">Click here to download ${data.fileName}</a>`);
                // Auto-open the download
                window.open(data.downloadUrl, '_blank');
            }
            
        } catch (error) {
            logMessage(error.message);
        } finally {
            enableAllButtons(false);
        }
    }

    function displayDynamoOutputs(resultData) {
        logMessage(`<br/>--- DYNAMO EXECUTION RESULTS ---`);
        
        if (!resultData || !resultData.info) {
            logMessage('No execution info found in result.json');
            return;
        }
        
        const info = resultData.info;
        
        // Display execution status
        logMessage(`<strong>Status:</strong> ${info.status || 'Unknown'}`);
        
        // Display issues if any
        if (info.issues && info.issues.length > 0) {
            logMessage(`<strong>Issues:</strong>`);
            info.issues.forEach((issue, index) => {
                logMessage(`  ${index + 1}. ${issue}`);
            });
        } else {
            logMessage(`<strong>Issues:</strong> None`);
        }
        
        // Display outputs
        if (info.outputs && info.outputs.length > 0) {
            logMessage(`<br/><strong>Captured Outputs:</strong>`);
            info.outputs.forEach((output, index) => {
                logMessage(`<br/><strong>Output ${index + 1}: ${output.name}</strong>`);
                logMessage(`  Type: ${output.type || 'Unknown'}`);
                
                if (output.value && Array.isArray(output.value)) {
                    const flatValues = output.value.flat();
                    logMessage(`  Values: ${flatValues.length} items`);
                    
                    // Display values in a readable format
                    if (flatValues.length <= 20) {
                        // Show all values if not too many
                        flatValues.forEach((val, i) => {
                            logMessage(`    ${i + 1}. ${val}`);
                        });
                    } else {
                        // Show first 10 and last 5 if too many
                        flatValues.slice(0, 10).forEach((val, i) => {
                            logMessage(`    ${i + 1}. ${val}`);
                        });
                        logMessage(`    ... (${flatValues.length - 15} more items) ...`);
                        flatValues.slice(-5).forEach((val, i) => {
                            logMessage(`    ${flatValues.length - 5 + i + 1}. ${val}`);
                        });
                    }
                    
                    // Special handling for element IDs
                    if (output.name.includes('Element') || output.name.includes('Delete')) {
                        logMessage(`  <em>→ ${flatValues.length} elements were processed</em>`);
                    }
                } else if (output.value) {
                    logMessage(`  Value: ${JSON.stringify(output.value)}`);
                } else {
                    logMessage(`  Value: (empty)`);
                }
            });
        } else {
            logMessage(`<strong>Captured Outputs:</strong> None (no nodes marked as outputs)`);
        }
        
        logMessage(`--- END RESULTS ---<br/>`);
    }
    
    async function postData(url, body, log, clickedButton) {
        clearLogAndDisableButtons(log, clickedButton);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...body, socketId })
            });
            const data = await response.json();
            logMessage(`--- RESPONSE (Status: ${response.status}) ---`);
            logMessage(`<pre>${JSON.stringify(data, null, 2)}</pre>`);
            if (!response.ok) throw new Error(`Request failed, see details above.`);
            
            // If this is a successful workitem, enable download buttons and get result URN
            if (url === '/api/aps/workitem' && response.ok && data.status === 'success') {
                btnDownloadResultJson.disabled = false;
                btnDownloadResultRvt.disabled = false;
                logMessage('Download buttons are now enabled!');
                
                // Get the result.rvt URN for viewer
                getResultUrn();
            }
        } catch (error) {
            logMessage(error.message);
        } finally {
            enableAllButtons(false);
        }
    }

    async function deleteData(url, log, clickedButton) {
        clearLogAndDisableButtons(log, clickedButton);
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ socketId })
            });
            const data = await response.json();
            logMessage(`--- RESPONSE (Status: ${response.status}) ---`);
            logMessage(`<pre>${JSON.stringify(data, null, 2)}</pre>`);
            if (!response.ok) throw new Error(`Request failed, see details above.`);
        } catch (error) {
            logMessage(error.message);
        } finally {
            enableAllButtons(false);
        }
    }

    function updateWorkitemButtonState() {
        // Enable workitem button only if required files are uploaded
        btnWorkitem.disabled = !(uploadedFiles.rvt && uploadedFiles.json);
    }

    function clearLogAndDisableButtons(log, clickedButton) {
        clearLog();
        if (log) logMessage(log);
        allButtons.forEach(btn => {
            btn.disabled = true;
        });
        // Keep upload JSON button disabled if no content
        if (!jsonContentTextarea.value.trim()) {
            btnUploadJson.disabled = true;
        }
    }

    function logMessage(message) {
        const logEntry = document.createElement('div');
        logEntry.classList.add('log-entry');
        logEntry.innerHTML = `[${new Date().toLocaleTimeString()}] ${message}`;
        outputLog.appendChild(logEntry);
        outputLog.scrollTop = outputLog.scrollHeight;
    }

    function clearLog() {
        outputLog.innerHTML = '';
    }

    function enableAllButtons(clearActive) {
        allButtons.forEach(btn => {
            btn.disabled = false;
        });
        // Keep upload JSON button disabled if no content
        if (!jsonContentTextarea.value.trim()) {
            btnUploadJson.disabled = true;
        }
        updateWorkitemButtonState();
    }

    // --- Viewer Functions (New Window) ---
    function openViewerWindow(urn, modelName) {
        const viewerUrl = `/viewer.html#${urn}`;
        const windowFeatures = 'width=1200,height=800,scrollbars=yes,resizable=yes';
        window.open(viewerUrl, `viewer_${urn}`, windowFeatures);
    }

    async function getResultUrn() {
        try {
            logMessage('Getting result.rvt URN for viewer...');
            const response = await fetch('/api/models');
            const models = await response.json();
            
            // Find result.rvt in the models list
            const resultModel = models.find(model => model.name === 'result.rvt');
            if (resultModel) {
                uploadedFiles.resultUrn = resultModel.urn;
                btnViewResultModel.disabled = false;
                logMessage(`Result model URN obtained: ${resultModel.urn}`);
                logMessage('You can now view the result model!');
            } else {
                logMessage('result.rvt not found in bucket. It may take a moment to appear.');
                // Retry after a short delay
                setTimeout(getResultUrn, 3000);
            }
        } catch (error) {
            logMessage(`Error getting result URN: ${error.message}`);
        }
    }
}); 