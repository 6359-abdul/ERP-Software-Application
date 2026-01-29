import React, { useState } from 'react';
import api from '../api';
import { ImportIcon, DownloadIcon } from './icons';

interface ImportStudentDataProps {
    onImportSuccess: () => void;
}

const ImportStudentData: React.FC<ImportStudentDataProps> = ({ onImportSuccess }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadStatus, setUploadStatus] = useState<string>('');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setSelectedFile(event.target.files[0]);
            setUploadStatus('');
        }
    };

    const handleUpload = async () => {
        if (selectedFile) {
            const formData = new FormData();
            formData.append('file', selectedFile);


            setUploadStatus('Uploading...');

            try {


                const response = await api.post('/students/upload_csv', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                const result = response.data;
                setUploadStatus(result.message || 'Upload successful!');
                setTimeout(() => {
                    onImportSuccess();
                }, 1500);

            } catch (error: any) {
                console.error("Upload error:", error);
                if (error.response) {
                    console.error("Backend response data:", error.response.data);
                    const data = error.response.data;
                    if (data.errors && data.errors.length > 0) {
                        setUploadStatus(`Upload failed. Errors: ${data.errors.join(', ')}`);
                    } else {
                        setUploadStatus(`Error: ${data.error || data.message || 'Upload failed'}`);
                    }
                } else if (error.request) {
                    setUploadStatus("Network error: No response from server. Ensure backend is running.");
                } else {
                    setUploadStatus(`Error: ${error.message}`);
                }
            }
        } else {
            setUploadStatus('Please select a file to upload.');
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const response = await api.get('/students/template', {
                responseType: 'blob', // Important for binary data
            });

            // Create a link to download the blob
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'student_import_template.xlsx');
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Error downloading template:", error);
            alert("Failed to download template. Please check if backend is running.");
        }
    };

    const instructions = [
        "Please don't make any changes in given template.",
        "Only 2000 records are accepted in the list at a time.",
        "The data should be in valid format to upload successfully.",
        "Student and father first name is mandatory field to import data.",
        "Mobile no and Adhar no should be in text format.(Setting- Format cells)",
        "Date should be in DD/MM/YYYY Format only using separators (/, - , .)",
        "For Status please enter 0 for new and 1 for Promoted student.",
        "For Gender please enter 1 for male, 2 for female, 3 for other.",
        "Please make a separate file for each class.",
        "Section column is mandatory.",
        "For student type (Enter 1 for day scholar and 2 for hosteller) otherwise considered as day scholar."
    ];

    return (
        <div className="p-4 md:p-6 bg-gray-100">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Side: Upload Section */}
                <div className="bg-white rounded-lg shadow-md border">
                    <div className="p-4 border-b flex items-center space-x-2">
                        <ImportIcon className="w-6 h-6 text-gray-600" />
                        <h2 className="text-lg font-semibold text-gray-700">Import Student Data</h2>
                        <a href="#" className="text-sm text-blue-500 hover:underline">Get Help</a>
                    </div>
                    <div className="p-6 space-y-4">
                        <label className="block text-md font-medium text-gray-800">Browse for the excel sheet:</label>
                        <div className="flex items-center space-x-2">
                            <label className="cursor-pointer bg-white border border-gray-300 rounded-l-md px-4 py-2 text-gray-700 hover:bg-gray-50 whitespace-nowrap">
                                Choose File
                                <input type="file" className="hidden" onChange={handleFileChange} accept=".csv, .xlsx, .xls" />
                            </label>
                            <input
                                type="text"
                                value={selectedFile ? selectedFile.name : "No file chosen"}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-300 rounded-r-md bg-gray-50 focus:outline-none"
                            />
                            <button onClick={handleUpload} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 whitespace-nowrap">
                                Upload Excel
                            </button>
                        </div>
                        {uploadStatus && <p className={`mt-2 text-sm ${uploadStatus.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>{uploadStatus}</p>}
                    </div>
                </div>

                {/* Right Side: Instructions Section */}
                <div className="bg-[#fff0f0] rounded-lg shadow-md border-l-4 border-red-500">
                    <div className="p-6">
                        <h3 className="text-lg font-bold text-red-700 mb-3">Important Instruction</h3>
                        <p className="text-sm text-gray-800 mb-4">Note: Please read the following instructions:</p>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                            {instructions.map((inst, index) => (
                                <li key={index}>{inst}</li>
                            ))}
                        </ol>
                        <div className="mt-6">
                            <button
                                onClick={handleDownloadTemplate}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2 shadow-md"
                            >
                                <DownloadIcon className="w-5 h-5" />
                                <span>Download Excel Template</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImportStudentData;
