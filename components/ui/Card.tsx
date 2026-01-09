import React from 'react';
import { type LucideIcon } from 'lucide-react';

interface CardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color: string;
}

const Card: React.FC<CardProps> = ({ title, value, icon: Icon, color }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm flex items-center justify-between hover:shadow-lg transition-shadow duration-300">
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-3xl font-bold text-gray-800">{value}</p>
            </div>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center`} style={{backgroundColor: `${color}20`}}>
                <Icon className="w-7 h-7" style={{color: color}} />
            </div>
        </div>
    );
};

export default Card;
