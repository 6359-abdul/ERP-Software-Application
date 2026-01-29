import React from 'react';

interface FeeReceiptProps {
  onClose: () => void;
  receiptData: {
    studentName: string; 
    admissionNo: string;
    className: string;
    receiptNo: string;
    paymentDate: string;
    paymentMode: string;
    paymentNote: string;
    items: { title: string; payable: number }[];
    amount: number;
    concession: number;
    payable: number;
  };
}

const FeeReceipt: React.FC<FeeReceiptProps> = ({ onClose, receiptData }) => {
  const { studentName, admissionNo, className, receiptNo, paymentDate, paymentMode, paymentNote, items, amount, concession, payable } = receiptData;

  const handlePrint = () => {
    const receiptElement = document.querySelector('.printable-receipt');
    if (!receiptElement) return;

    // Get all style sheets from the main document
    const stylesheets = Array.from(document.styleSheets)
      .map(sheet => {
        try {
          return Array.from(sheet.cssRules)
            .map(rule => rule.cssText)
            .join('');
        } catch (e) {
          // Ignore CORS-restricted stylesheets
          console.warn('Could not read CSS rules from stylesheet:', sheet.href);
          return '';
        }
      })
      .join('\n');

    const googleFonts = document.querySelector('link[href^="https://fonts.googleapis.com"]')?.outerHTML || '';

    const printContent = receiptElement.innerHTML;
    
    const printWindow = window.open('', '', 'height=800,width=800');
    if (!printWindow) {
        alert('Could not open print window. Please disable pop-up blockers.');
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Fee Receipt</title>
            ${googleFonts}
            <style>
                ${stylesheets}
                body { 
                    font-family: 'Poppins', sans-serif; 
                    -webkit-print-color-adjust: exact; /* Important for Chrome */
                    color-adjust: exact; /* Standard */
                }
                @media print {
                  body { margin: 0; }
                  .no-print { display: none !important; }
                }
            </style>
        </head>
        <body>
            ${printContent}
        </body>
        </html>
    `);

    printWindow.document.close();

    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }, 500);
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00'); // Treat as local date
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="printable-receipt p-8 text-gray-800 bg-white">
            {/* Header */}
            <div className="flex items-center justify-start mb-4">
                <img src="https://mshifzacademy.com/assets/images/ms-logo.jpg" alt="School Logo" className="h-16 mr-4" />
                <div>
                    <h1 className="text-2xl font-bold text-black">MS Education Academy</h1>
                    <p className="text-md text-gray-600">Fee Receipt</p>
                </div>
            </div>
            <hr className="my-6" />

            {/* Student & Receipt Info */}
            <div className="flex justify-between text-sm mb-8">
                <div>
                    <p><strong className="font-semibold">Student Name:</strong> {studentName}</p>
                    <p><strong className="font-semibold">Admission No:</strong> {admissionNo}</p>
                    <p><strong className="font-semibold">Class:</strong> {className}</p>
                </div>
                <div className="text-right">
                    <p><strong className="font-semibold">Receipt No:</strong> {receiptNo}</p>
                    <p><strong className="font-semibold">Payment Date:</strong> {formatDate(paymentDate)}</p>
                    <p><strong className="font-semibold">Payment Mode:</strong> {paymentMode}</p>
                </div>
            </div>

            {/* Fee Details Table */}
            <table className="w-full text-sm text-left mb-8">
                <thead className="bg-gray-100 text-gray-700">
                    <tr>
                        <th className="px-4 py-2 font-semibold tracking-wider">SR. NO</th>
                        <th className="px-4 py-2 font-semibold tracking-wider">FEE DETAILS</th>
                        <th className="px-4 py-2 font-semibold tracking-wider text-right">AMOUNT</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => (
                        <tr key={item.title} className="border-b">
                            <td className="px-4 py-3">{index + 1}</td>
                            <td className="px-4 py-3 font-medium">{item.title}</td>
                            <td className="px-4 py-3 text-right font-mono">₹{item.payable.toLocaleString('en-IN')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Footer & Totals */}
            <div className="flex justify-between items-start">
                <div className="text-sm">
                    {paymentNote && <p><strong className="font-semibold">Note:</strong> {paymentNote}</p>}
                </div>
                <div className="w-1/3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-mono text-right">₹{amount.toLocaleString('en-IN')}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-gray-600">Concession:</span>
                        <span className="font-mono text-right">- ₹{concession.toLocaleString('en-IN')}</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between font-bold text-base">
                        <span>Net Payable:</span>
                        <span className="font-mono text-right">₹{payable.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>
            
            <div className="text-center text-xs text-gray-400 mt-12">
                This is a computer-generated receipt.
            </div>
        </div>
        
        <div className="p-6 pt-0 flex justify-end space-x-4 no-print">
          <button onClick={onClose} className="px-6 py-2 text-sm font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">Close</button>
          <button onClick={handlePrint} className="px-6 py-2 text-sm font-semibold text-white bg-violet-700 rounded-md hover:bg-violet-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500">Print</button>
        </div>
      </div>
    </div>
  );
};

export default FeeReceipt;