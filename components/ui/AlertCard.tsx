import React from 'react';
import { type LucideIcon } from 'lucide-react';

interface AlertCardProps {
    title: string;
    value: string;
    subtext: string;
    icon: LucideIcon;
    color: 'red' | 'orange' | 'yellow';
    actionText: string;
    onActionClick: () => void;
}

const AlertCard: React.FC<AlertCardProps> = ({ title, value, subtext, icon: Icon, color, actionText, onActionClick }) => {
    const colorClasses = {
        red: {
            border: 'border-red-500',
            iconBg: 'bg-red-100',
            iconText: 'text-red-600',
        },
        orange: {
            border: 'border-orange-500',
            iconBg: 'bg-orange-100',
            iconText: 'text-orange-600',
        },
        yellow: {
            border: 'border-yellow-400',
            iconBg: 'bg-yellow-100',
            iconText: 'text-yellow-600',
        },
    };

    const selectedColor = colorClasses[color];

    return (
        <div className={`bg-white p-4 rounded-xl shadow-sm flex items-center justify-between border-l-4 ${selectedColor.border} hover:shadow-md transition-shadow duration-200`}>
            <div className="flex items-center">
                <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center mr-4 ${selectedColor.iconBg}`}>
                    <Icon className={`w-6 h-6 ${selectedColor.iconText}`} />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <p className="text-2xl font-bold text-gray-800">{value}</p>
                    <p className="text-xs text-gray-400 mt-1">{subtext}</p>
                </div>
            </div>
            <button 
                onClick={onActionClick} 
                className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors whitespace-nowrap ml-4"
            >
                {actionText} &rarr;
            </button>
        </div>
    );
};

export default AlertCard;
