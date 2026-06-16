import React from 'react';
import { Page } from '../App';
import FinancialDashboard from './FinancialDashboard';

interface FeeProps {
    navigateTo: (page: Page) => void;
}

const Fee: React.FC<FeeProps> = ({ navigateTo }) => {
    return (
        <div className="w-full h-full">
            <FinancialDashboard />
        </div>
    );
};

export default Fee;