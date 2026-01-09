
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { User, Role } from '../types';
import Table from './ui/Table';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Select from './ui/Select';
import { PlusCircle, Edit, Trash2, Mail, Hotel } from 'lucide-react';

const getInitials = (name: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const generateAvatarColors = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['bg-red-200 text-red-800', 'bg-orange-200 text-orange-800', 'bg-amber-200 text-amber-800', 'bg-lime-200 text-lime-800', 'bg-blue-200 text-blue-800', 'bg-purple-200 text-purple-800', 'bg-pink-200 text-pink-800'];
    return colors[Math.abs(hash % colors.length)];
};

const getRoleBadge = (role: Role) => {
    const roleClasses: { [key in Role]: string } = {
        'Super Admin': 'bg-purple-100 text-purple-800',
        'Manager': 'bg-blue-100 text-blue-800',
        'Receptionist': 'bg-green-100 text-green-800',
        'Cleaner': 'bg-gray-100 text-gray-700',
        'Accountant': 'bg-yellow-100 text-yellow-800',
    };
    const style = roleClasses[role] || 'bg-gray-200 text-gray-800';
    return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${style}`}>{role}</span>;
};

const getStatusIndicator = (status: 'Active' | 'Pending Invite') => {
    const statusClasses = {
        'Active': 'bg-green-500',
        'Pending Invite': 'bg-orange-500',
    };
    return (
        <div className="flex items-center">
            <span className={`h-2.5 w-2.5 rounded-full mr-2 ${statusClasses[status]}`}></span>
            <span>{status}</span>
        </div>
    );
};


const InvitationEmailPreview: React.FC<{ name: string, role: string, onClose: () => void }> = ({ name, role, onClose }) => (
    <Modal isOpen={true} onClose={onClose} title="Email Preview">
        <div className="bg-gray-100 p-6 rounded-lg">
            <div className="max-w-xl mx-auto bg-white p-8 rounded-md shadow">
                <div className="flex items-center justify-center mb-6 pb-4 border-b">
                    <Hotel className="h-8 w-8 mr-3 text-blue-600" />
                    <h1 className="text-2xl font-bold text-gray-800 tracking-wider">Horizon Hotel System</h1>
                </div>
                <div className="space-y-4 text-gray-700">
                    <p className="text-lg font-semibold">Subject: Welcome to Horizon Hotel! Please set up your account.</p>
                    <p>Hi {name || '[Name]'},</p>
                    <p>You have been invited to join the Horizon Hotel Management System as a {role || '[Role]'}.</p>
                    <p>To get started, please click the button below to set your secure password.</p>
                    <div className="text-center py-4">
                        <a href="#" onClick={(e) => e.preventDefault()} className="inline-block bg-blue-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-blue-700 transition-colors">
                            Setup My Account
                        </a>
                    </div>
                </div>
                <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
                    <p>Link expires in 24 hours. If you did not expect this, please ignore this email.</p>
                </div>
            </div>
        </div>
    </Modal>
);


const UserManagement: React.FC = () => {
    const { allUsers } = useData();
    const [isInviteModalOpen, setInviteModalOpen] = useState(false);
    const [isPreviewingEmail, setIsPreviewingEmail] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Receptionist' as Role });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setNewUser(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };

    const handleSendInvite = (e: React.FormEvent) => {
        e.preventDefault();
        alert(`Invitation sent to ${newUser.name} at ${newUser.email} for the role of ${newUser.role}.`);
        setInviteModalOpen(false);
        setNewUser({ name: '', email: '', role: 'Receptionist' });
    };

    const columns = [
        {
            header: 'USER',
            accessor: (user: User) => (
                <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center mr-4 font-bold ${generateAvatarColors(user.name)}`}>
                        {getInitials(user.name)}
                    </div>
                    <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                    </div>
                </div>
            ),
            align: 'left' as const,
        },
        { header: 'EMAIL ADDRESS', accessor: 'email' as keyof User, align: 'left' as const },
        { header: 'ROLE', accessor: (user: User) => getRoleBadge(user.role) },
        { header: 'STATUS', accessor: (user: User) => getStatusIndicator(user.status) },
        { header: 'LAST LOGIN', accessor: 'lastLogin' as keyof User },
    ];
    
    const roleOptions: { value: Role, label: string }[] = [
        { value: 'Manager', label: 'Manager' },
        { value: 'Receptionist', label: 'Receptionist' },
        { value: 'Cleaner', label: 'Housekeeping' }, // Use Cleaner role but display as Housekeeping
        { value: 'Accountant', label: 'Accountant' },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
                <Button leftIcon={<PlusCircle />} onClick={() => setInviteModalOpen(true)}>
                    Add New User
                </Button>
            </div>

            <Table<User>
                columns={columns}
                data={allUsers}
                isScrollable={false}
                renderRowActions={() => (
                    <div className="flex items-center justify-center space-x-2">
                        <button title="Edit User" className="text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-gray-100 transition-colors">
                            <Edit size={18} />
                        </button>
                        <button title="Deactivate User" className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-gray-100 transition-colors">
                            <Trash2 size={18} />
                        </button>
                    </div>
                )}
            />
            
            {/* Pagination would go here if needed */}
            
             <Modal isOpen={isInviteModalOpen} onClose={() => setInviteModalOpen(false)} title="Invite Team Member">
                <form onSubmit={handleSendInvite} className="space-y-4">
                    <p className="text-sm text-gray-600 mb-4">
                        Enter the details below. We will email them a link to set their password.
                    </p>
                    <Input id="name" label="Full Name" value={newUser.name} onChange={handleInputChange} required autoFocus placeholder="e.g., Sarah Conner"/>
                    <Input id="email" label="Email Address" type="email" value={newUser.email} onChange={handleInputChange} required placeholder="e.g., sarah@horizon.com" />
                    <Select id="role" label="Role / Permission" value={newUser.role} onChange={handleInputChange}>
                        {roleOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </Select>
                    <div className="flex justify-between items-center pt-4">
                        <button type="button" className="text-sm text-blue-600 hover:underline" onClick={() => setIsPreviewingEmail(true)}>
                            Preview Invitation
                        </button>
                        <div className="flex space-x-2">
                            <button type="button" className="text-sm font-medium text-gray-600 hover:text-gray-800 px-4 py-2" onClick={() => setInviteModalOpen(false)}>
                                Cancel
                            </button>
                            <Button type="submit" leftIcon={<Mail size={16}/>}>Send Invitation</Button>
                        </div>
                    </div>
                </form>
            </Modal>
            
            {isPreviewingEmail && (
                <InvitationEmailPreview
                    name={newUser.name}
                    role={roleOptions.find(r => r.value === newUser.role)?.label || ''}
                    onClose={() => setIsPreviewingEmail(false)}
                />
            )}
        </div>
    );
};

export default UserManagement;
