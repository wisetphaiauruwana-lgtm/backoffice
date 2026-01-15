import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import UserManagement from './UserManagement';
import ChangePasswordModal from './ui/ChangePasswordModal';
import { Users, Lock } from 'lucide-react';
import { SettingsCategory } from '../types';
import Toast from './ui/Toast';
import { usePermissions } from '../hooks/usePermissions';
import AccessDenied from './ui/AccessDenied';

const Settings: React.FC = () => {
    const { isOwner } = usePermissions();
    const [activeCategory, setActiveCategory] = useState<SettingsCategory>('users');
    const [isChangePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const categories: { id: SettingsCategory; label: string; icon: React.ElementType }[] = isOwner
        ? [
            { id: 'users', label: 'Users & Roles', icon: Users },
            { id: 'security', label: 'Security', icon: Lock },
        ]
        : [{ id: 'security', label: 'Security', icon: Lock }];

    useEffect(() => {
        if (!isOwner && activeCategory !== 'security') {
            setActiveCategory('security');
        }
    }, [activeCategory, isOwner]);

    const renderContent = () => {
        switch (activeCategory) {
            case 'users':
                return <UserManagement />;
            case 'security':
                return (
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 mb-6">Security Settings</h2>
                        <div className="max-w-md">
                            <div className="bg-gray-50 p-4 rounded-lg border">
                                <h3 className="font-semibold text-gray-700">Password</h3>
                                <p className="text-sm text-gray-500 mt-1">Change your account password.</p>
                                <Button className="mt-4" onClick={() => setChangePasswordModalOpen(true)}>
                                    Change Password
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            default:
                return <div className="text-center text-gray-500 py-10">Select a category to view its settings.</div>;
        }
    };

    return (
        <div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Settings</h1>
            <div className="flex flex-col md:flex-row gap-8">
                <aside className="w-full md:w-1/4 lg:w-1/5">
                    <nav className="space-y-1">
                        {categories.map(category => (
                            <button
                                key={category.id}
                                onClick={() => setActiveCategory(category.id)}
                                className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                                    activeCategory === category.id
                                        ? 'bg-blue-600 text-white shadow'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <category.icon className="h-5 w-5 mr-3" />
                                <span>{category.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                <main className="flex-1">
                    <div className="bg-white p-6 rounded-xl shadow-sm min-h-[60vh] flex flex-col">
                        <div className="flex-1">
                            {renderContent()}
                        </div>
                    </div>
                </main>
            </div>
            <ChangePasswordModal
                isOpen={isChangePasswordModalOpen}
                onClose={() => setChangePasswordModalOpen(false)}
            />
        </div>
    );
};

export default Settings;
