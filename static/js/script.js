// static/js/script.js
document.addEventListener('DOMContentLoaded', function () {
    // --- Theme Switcher ---
    const themeSwitcher = document.getElementById('themeSwitcher');
    const htmlElement = document.documentElement; // Target <html> for data-bs-theme
    const sunIcon = '<i class="bi bi-sun-fill"></i>';
    const moonIcon = '<i class="bi bi-moon-stars-fill"></i>';

    const applyTheme = (theme) => {
        htmlElement.setAttribute('data-bs-theme', theme);
        if (themeSwitcher) {
            themeSwitcher.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
        }
    };

    // Check for saved theme or system preference
    const storedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = storedTheme || (systemPrefersDark ? 'dark' : 'light');
    applyTheme(initialTheme);

    if (themeSwitcher) {
        themeSwitcher.addEventListener('click', () => {
            let currentTheme = htmlElement.getAttribute('data-bs-theme');
            let newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    }

    // --- Generic File Handling & UI Updates ---
    let uploadedConvertFile = null;
    let uploadedMergeFiles = []; // Store File objects

    function getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
    }

    function getFileIcon(extension) { // Same as before
        switch (extension) {
            case 'pdf': return '<i class="bi bi-file-earmark-pdf-fill text-danger"></i>';
            case 'doc': case 'docx': return '<i class="bi bi-file-earmark-word-fill text-primary"></i>';
            case 'ppt': case 'pptx': return '<i class="bi bi-file-earmark-slides-fill text-warning"></i>'; // text-orange might be bootstrap 5
            case 'jpg': case 'jpeg': case 'png': case 'gif': return '<i class="bi bi-file-earmark-image-fill text-success"></i>';
            default: return '<i class="bi bi-file-earmark-fill text-secondary"></i>';
        }
    }
    
    function displaySelectedFiles(fileListElement, filesArray, isSingleFileMode = false) { // filesArray is now an array of File objects
        if (!fileListElement) return;
        fileListElement.innerHTML = ''; 
        if (isSingleFileMode && filesArray.length > 0) {
            const file = filesArray[0]; // Should only be one
            const listItem = document.createElement('li');
            listItem.innerHTML = `${getFileIcon(getFileExtension(file.name))} ${file.name} (${(file.size / 1024).toFixed(1)} KB) <span class="remove-file" data-filename="${file.name}" title="Remove file">×</span>`;
            fileListElement.appendChild(listItem);
        } else if (!isSingleFileMode) {
            filesArray.forEach(file => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `${getFileIcon(getFileExtension(file.name))} ${file.name} (${(file.size / 1024).toFixed(1)} KB) <span class="remove-file" data-filename="${file.name}" title="Remove file">×</span>`;
                fileListElement.appendChild(listItem);
            });
        }
    }

    // --- Converter Specific Logic ---
    const convertDropArea = document.getElementById('dropArea');
    const convertFileInputActual = document.getElementById('convertFileInputActual');
    const convertFileList = document.getElementById('fileList');
    const convertToSelect = document.getElementById('convertTo');
    const convertButton = document.getElementById('convertButton');
    const convertStatusArea = document.getElementById('convertStatusArea');
    const convertProgressBar = document.getElementById('convertProgressBar');
    const convertStatusMessage = document.getElementById('convertStatusMessage');
    const convertDownloadLinkContainer = document.getElementById('convertDownloadLinkContainer');

    // Define conversion options based on INPUT file type
    const convertOptionsMap = {
        'pdf': [
            { value: 'docx', text: 'DOCX (Editable Document)' },
            { value: 'images', text: 'Images (ZIP of PNGs per page)' },
            // { value: 'txt', text: 'TXT (Plain Text)' } // Add if backend has robust PDF->TXT
        ],
        'docx': [
            { value: 'pdf', text: 'PDF (Standard Document)' },
            // { value: 'txt', text: 'TXT (Plain Text)' }
        ],
        'pptx': [
            { value: 'pdf', text: 'PDF (Basic Presentation Slides)' }
        ],
        'jpg':  [{ value: 'pdf', text: 'PDF (Image in Document)' }, { value: 'png', text: 'PNG Image' }],
        'jpeg': [{ value: 'pdf', text: 'PDF (Image in Document)' }, { value: 'png', text: 'PNG Image' }], // Alias for jpg
        'png':  [{ value: 'pdf', text: 'PDF (Image in Document)' }, { value: 'jpg', text: 'JPEG Image' }]
    };
    convertOptionsMap['jpeg'] = convertOptionsMap['jpg']; // Ensure alias

    function updateConvertToOptions() {
        if (!convertToSelect) return;
        convertToSelect.innerHTML = '<option value="">-- Select uploaded file first --</option>';
        convertToSelect.disabled = true;
        if(convertButton) convertButton.disabled = true;

        if (uploadedConvertFile) {
            const extension = getFileExtension(uploadedConvertFile.name);
            const options = convertOptionsMap[extension] || [];
            if (options.length > 0) {
                convertToSelect.innerHTML = '<option value="">-- Select target format --</option>'; // Placeholder
                options.forEach(opt => {
                    convertToSelect.add(new Option(opt.text, opt.value));
                });
                convertToSelect.disabled = false;
                // Enable convert button only when a target format is chosen
                convertToSelect.onchange = () => {
                    if(convertButton) convertButton.disabled = !convertToSelect.value; // Disable if placeholder is selected
                };
            } else {
                convertToSelect.innerHTML = '<option value="">-- No conversions for this file type --</option>';
            }
        }
    }

    function handleConvertFileUpload(files) { // files is a FileList
        if (files.length > 0) {
            uploadedConvertFile = files[0]; // Take only the first file for converter
            displaySelectedFiles(convertFileList, [uploadedConvertFile], true); // Pass as an array
            updateConvertToOptions();
            resetConvertStatus(); // Clear any previous status/download link
        }
    }
    
    if (convertDropArea) setupDragAndDrop(convertDropArea, convertFileInputActual, handleConvertFileUpload);
    if (convertFileInputActual) convertFileInputActual.addEventListener('change', (e) => handleConvertFileUpload(e.target.files));
    
    if (convertFileList) convertFileList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-file')) {
            uploadedConvertFile = null;
            if(convertFileInputActual) convertFileInputActual.value = ''; // Reset file input
            displaySelectedFiles(convertFileList, [], true);
            updateConvertToOptions(); // This will disable select & button
            resetConvertStatus();
        }
    });


    // --- Merger Specific Logic ---
    const mergeDropArea = document.getElementById('dropAreaMerge');
    const mergeFilesInputActual = document.getElementById('mergeFilesInputActual');
    const mergeFileList = document.getElementById('fileListMerge');
    const mergeTypeInput = document.getElementById('mergeType'); // Hidden input
    const mergeButton = document.getElementById('mergeButton');
    const mergeStatusArea = document.getElementById('mergeStatusArea');
    const mergeProgressBar = document.getElementById('mergeProgressBar');
    const mergeStatusMessage = document.getElementById('mergeStatusMessage');
    const mergeDownloadLinkContainer = document.getElementById('mergeDownloadLinkContainer');
    const allowedMergeTypes = ['pdf', 'docx']; // Keep this updated with backend

    function updateMergeButtonStateAndType() {
        if (!mergeButton || !mergeTypeInput) return;
        let firstFileType = null;
        let allSameType = true;

        if (uploadedMergeFiles.length > 0) {
            firstFileType = getFileExtension(uploadedMergeFiles[0].name);
            if (!allowedMergeTypes.includes(firstFileType)) {
                allSameType = false; // Mark as invalid type for merging
                 if (mergeStatusMessage) mergeStatusMessage.textContent = `Merging .${firstFileType} files is not supported.`;
                 if (mergeStatusArea) mergeStatusArea.style.display = 'block';
            } else {
                for (let i = 1; i < uploadedMergeFiles.length; i++) {
                    if (getFileExtension(uploadedMergeFiles[i].name) !== firstFileType) {
                        allSameType = false;
                        break;
                    }
                }
            }
        }
        
        const enableButton = uploadedMergeFiles.length >= 2 && allSameType && allowedMergeTypes.includes(firstFileType);
        mergeButton.disabled = !enableButton;
        mergeTypeInput.value = enableButton ? firstFileType : '';

        if (uploadedMergeFiles.length > 0 && !allSameType && allowedMergeTypes.includes(firstFileType)) {
            if (mergeStatusMessage) mergeStatusMessage.textContent = 'All files must be of the same supported type (e.g., all PDFs or all DOCXs).';
            if (mergeStatusArea) mergeStatusArea.style.display = 'block';
        } else if (enableButton && mergeStatusMessage && mergeStatusArea && mergeStatusArea.style.display === 'block' && (mergeStatusMessage.textContent.includes('All files must be') || mergeStatusMessage.textContent.includes('not supported'))) {
            resetMergeStatus(); // Clear error if now valid
        } else if (uploadedMergeFiles.length < 2 && uploadedMergeFiles.length > 0) {
            // Clear type specific error if only one file, button is disabled anyway
            if (mergeStatusMessage && (mergeStatusMessage.textContent.includes('All files must be') || mergeStatusMessage.textContent.includes('not supported'))) {
                 resetMergeStatus();
            }
        }
    }

    function handleMergeFileUpload(files) { // files is a FileList
        const newFilesArray = Array.from(files);
        newFilesArray.forEach(file => {
            // Simple duplicate check by name
            if (!uploadedMergeFiles.find(existingFile => existingFile.name === file.name && existingFile.size === file.size)) {
                uploadedMergeFiles.push(file);
            }
        });
        displaySelectedFiles(mergeFileList, uploadedMergeFiles, false);
        updateMergeButtonStateAndType();
        resetMergeStatus();
    }

    if (mergeDropArea) setupDragAndDrop(mergeDropArea, mergeFilesInputActual, handleMergeFileUpload);
    if (mergeFilesInputActual) mergeFilesInputActual.addEventListener('change', (e) => handleMergeFileUpload(e.target.files));
    
    if (mergeFileList) mergeFileList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-file')) {
            const filenameToRemove = e.target.dataset.filename;
            // Remove based on name, assuming names are unique enough for this UI
            uploadedMergeFiles = uploadedMergeFiles.filter(f => f.name !== filenameToRemove);
            if (uploadedMergeFiles.length === 0 && mergeFilesInputActual) {
                mergeFilesInputActual.value = ''; // Reset actual input if list is empty
            }
            displaySelectedFiles(mergeFileList, uploadedMergeFiles, false);
            updateMergeButtonStateAndType();
        }
    });

    // --- Drag and Drop Helper ---
    function setupDragAndDrop(area, inputElement, fileHandlerCallback) {
        if (!area || !inputElement) return;
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            area.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false); // Prevent browser default for whole page during drag
        });
        ['dragenter', 'dragover'].forEach(eventName => {
            area.addEventListener(eventName, () => area.classList.add('highlight'), false);
        });
        ['dragleave', 'drop'].forEach(eventName => {
            area.addEventListener(eventName, () => area.classList.remove('highlight'), false);
        });
        area.addEventListener('drop', (e) => {
            // Don't directly set inputElement.files as it's a read-only FileList in some contexts
            // Instead, pass e.dataTransfer.files to the handler, which manages its own file array
            fileHandlerCallback(e.dataTransfer.files);
        }, false);
        area.addEventListener('click', (e) => {
            // Prevent click if it's on a remove button inside the drop area (if any)
            if (e.target.classList.contains('remove-file')) return;
            inputElement.click();
        });
    }
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // --- Form Submission with AJAX & Progress ---
    function submitFormWithProgress(formElement, statusArea, progressBarElem, statusMessageElem, downloadContainer, successUiCallback) {
        formElement.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(); // Create fresh FormData
            const actionUrl = formElement.dataset.actionUrl;

            if (!actionUrl) {
                console.error("Form action URL is not defined for form:", formElement.id);
                statusMessageElem.textContent = "Configuration error: Action URL missing.";
                statusMessageElem.className = 'status-message text-danger';
                statusArea.style.display = 'block';
                return;
            }
            
            // Append files from our JS managed arrays
            if (formElement.id === 'convertForm' && uploadedConvertFile) {
                formData.append('file_to_convert', uploadedConvertFile, uploadedConvertFile.name);
                // Append other form fields from the form
                const targetFormat = formElement.querySelector('[name="target_format"]');
                if(targetFormat) formData.append('target_format', targetFormat.value);

            } else if (formElement.id === 'mergeForm' && uploadedMergeFiles.length > 0) {
                uploadedMergeFiles.forEach(file => {
                    formData.append('files_to_merge', file, file.name); // Changed name to files_to_merge as per Flask
                });
                const mergeType = formElement.querySelector('[name="merge_type"]');
                 if(mergeType) formData.append('merge_type', mergeType.value);
            } else {
                statusMessageElem.textContent = "No files selected or invalid state.";
                statusMessageElem.className = 'status-message text-warning';
                statusArea.style.display = 'block';
                return;
            }


            statusArea.style.display = 'block';
            progressBarElem.style.width = '0%';
            progressBarElem.textContent = '0%';
            if (progressBarElem.parentElement) progressBarElem.parentElement.style.display = 'flex';
            statusMessageElem.textContent = 'Uploading...';
            statusMessageElem.className = 'status-message text-info'; // Reset class
            downloadContainer.innerHTML = '';

            const xhr = new XMLHttpRequest();
            xhr.open('POST', actionUrl, true);

            xhr.upload.onprogress = function (event) {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    progressBarElem.style.width = percentComplete + '%';
                    progressBarElem.textContent = percentComplete + '%';
                    if (percentComplete < 100) {
                        statusMessageElem.textContent = `Uploading... ${percentComplete}%`;
                    } else {
                         statusMessageElem.textContent = 'Upload complete. Processing on server...';
                    }
                }
            };

            xhr.onload = function () {
                if (progressBarElem.parentElement) progressBarElem.parentElement.style.display = 'none';
                
                let response;
                try {
                    response = JSON.parse(xhr.responseText);
                } catch (jsonError) {
                    statusMessageElem.textContent = `Server returned non-JSON response (Status: ${xhr.status}). Check server logs.`;
                    statusMessageElem.className = 'status-message text-danger';
                    console.error("Non-JSON response:", xhr.responseText);
                    return;
                }

                if (xhr.status >= 200 && xhr.status < 300 && response.success) {
                    statusMessageElem.textContent = response.message || 'Processing successful!';
                    statusMessageElem.className = 'status-message text-success';
                    if (response.download_url) {
                        const downloadLink = document.createElement('a');
                        downloadLink.href = response.download_url;
                        downloadLink.textContent = `Download ${response.filename || 'Processed File'}`;
                        downloadLink.className = 'btn btn-success mt-2';
                        downloadLink.setAttribute('download', response.filename || '');
                        downloadContainer.appendChild(downloadLink);
                    }
                    if(successUiCallback) successUiCallback();
                } else {
                    statusMessageElem.textContent = response.error || `An error occurred (Status: ${xhr.status}).`;
                    statusMessageElem.className = 'status-message text-danger';
                }
            };

            xhr.onerror = function () {
                if(progressBarElem.parentElement) progressBarElem.parentElement.style.display = 'none';
                statusMessageElem.textContent = 'Network error occurred. Please check your connection.';
                statusMessageElem.className = 'status-message text-danger';
            };
            xhr.send(formData);
        });
    }

    const convertForm = document.getElementById('convertForm');
    if (convertForm) {
        submitFormWithProgress(
            convertForm,
            convertStatusArea, convertProgressBar, convertStatusMessage, convertDownloadLinkContainer,
            () => { // Success callback for UI reset
                uploadedConvertFile = null;
                if(convertFileInputActual) convertFileInputActual.value = ''; // Clear native input
                if(convertFileList) displaySelectedFiles(convertFileList, [], true);
                if(convertToSelect) updateConvertToOptions(); // Resets and disables
            }
        );
    }
    const mergeForm = document.getElementById('mergeForm');
    if (mergeForm) {
         submitFormWithProgress(
            mergeForm,
            mergeStatusArea, mergeProgressBar, mergeStatusMessage, mergeDownloadLinkContainer,
            () => { // Success callback for UI reset
                uploadedMergeFiles = [];
                if(mergeFilesInputActual) mergeFilesInputActual.value = ''; // Clear native input
                if(mergeFileList) displaySelectedFiles(mergeFileList, [], false);
                if(mergeButton) updateMergeButtonStateAndType(); // Resets and disables
            }
        );
    }
    
    function resetConvertStatus() {
        if (convertStatusArea) convertStatusArea.style.display = 'none';
        if (convertProgressBar) { convertProgressBar.style.width = '0%'; convertProgressBar.textContent = '0%'; if(convertProgressBar.parentElement) convertProgressBar.parentElement.style.display = 'none';} // Hide progress fully
        if (convertStatusMessage) {convertStatusMessage.textContent = ''; convertStatusMessage.className='status-message text-center';}
        if (convertDownloadLinkContainer) convertDownloadLinkContainer.innerHTML = '';
    }
    function resetMergeStatus() {
        if (mergeStatusArea) mergeStatusArea.style.display = 'none';
        if (mergeProgressBar) { mergeProgressBar.style.width = '0%'; mergeProgressBar.textContent = '0%'; if(mergeProgressBar.parentElement) mergeProgressBar.parentElement.style.display = 'none';} // Hide progress fully
        if (mergeStatusMessage) {mergeStatusMessage.textContent = ''; mergeStatusMessage.className='status-message text-center';}
        if (mergeDownloadLinkContainer) mergeDownloadLinkContainer.innerHTML = '';
    }

}); // End DOMContentLoaded