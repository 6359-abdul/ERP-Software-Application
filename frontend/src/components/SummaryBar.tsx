import React from 'react';
import { useSchool } from '../contexts/SchoolContext';
import { UserIcon, CurrencyRupeeIcon, ReceiptIcon } from './icons';

const SummaryCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white p-4 rounded-lg shadow-sm flex items-center space-x-4 border-l-4" style={{ borderColor: color }}>
        {/* FIX: Removed React.cloneElement and applied color to the parent div. The icon will inherit the color. */}
        <div className="p-3 rounded-full" style={{ backgroundColor: `${color}1A`, color }}>
            {icon}
        </div>
        <div> 
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-xl font-semibold text-gray-800">{value}</p>
        </div>
    </div>
);


const SummaryBar: React.FC = () => {
    const { students } = useSchool();

    // Read selected branch from localStorage (matches api.ts usage)
    const currentBranch = (localStorage.getItem('currentBranch') || 'All').trim();
    const normalizedBranch = currentBranch.toLowerCase();
    const isAll = !normalizedBranch || normalizedBranch.startsWith('all');

    // Resolve Branch Name from ID (SAFE fix for Mixed Data)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const allowed = user.allowed_branches || [];
    let targetBranchName = currentBranch;

    if (Array.isArray(allowed)) {
        const branchObj = allowed.find((b: any) => String(b.branch_id) === currentBranch);
        if (branchObj) targetBranchName = branchObj.branch_name;
    }

    const filteredStudents = isAll
        ? students
        : students.filter(s => {
            const sBranch = (s.branch || '').toLowerCase().trim();
            return sBranch === normalizedBranch || sBranch === targetBranchName.toLowerCase().trim();
        });

    const totalStudents = filteredStudents.length;

    const totalDues = filteredStudents.reduce((total, student) => {
        const studentDues = (student.feeInstallments || [])
            .filter(inst => !inst.paid)
            .reduce((sum, inst) => sum + (inst.payable || 0), 0);
        return total + studentDues;
    }, 0);

    const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <SummaryCard
                title="Total Students"
                value={totalStudents}
                icon={<UserIcon className="w-6 h-6" />}
                color="#4f46e5"
            />
            <SummaryCard
                title="Total Fee Dues"
                value={formatCurrency(totalDues)}
                icon={<CurrencyRupeeIcon className="w-6 h-6" />}
                color="#db2777"
            />

        </div>
    );
};

export default SummaryBar;