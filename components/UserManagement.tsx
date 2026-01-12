
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { User, Role } from '../types';
import Table from './ui/Table';
import Button from './ui/Button';
import Modal from './ui/Modal';
import Toast from './ui/Toast';
import Input from './ui/Input';
import Select from './ui/Select';
import { PlusCircle, Edit, Trash2, Mail, Hotel } from 'lucide-react';
import { adminsService } from '../services/admins.service';
import { usePermissions } from '../hooks/usePermissions';
import AccessDenied from './ui/AccessDenied';

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
    const roleLabel = role === 'owner' ? 'Owner' : role;
    const roleClasses: { [key in Role]: string } = {
        'owner': 'bg-indigo-100 text-indigo-800',
        'Manager': 'bg-blue-100 text-blue-800',
        'Receptionist': 'bg-green-100 text-green-800',
        'Cleaner': 'bg-gray-100 text-gray-700',
    };
    const style = roleClasses[role] || 'bg-gray-200 text-gray-800';
    return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${style}`}>{roleLabel}</span>;
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
    const { allUsers, setAllUsers } = useData();
    const { can } = usePermissions();
    const canView = can('rolesAndPermissions', 'view');
    const canCreate = can('rolesAndPermissions', 'create');
    const canDelete = can('rolesAndPermissions', 'delete');
    const [isInviteModalOpen, setInviteModalOpen] = useState(false);
    const [isPreviewingEmail, setIsPreviewingEmail] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        role: 'Receptionist' as Role,
        fromEmail: '',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setNewUser(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };

    const handleSendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setToast(null);
        if (!canCreate) return;
        setIsSubmitting(true);
        try {
            const response = await adminsService.invite({
                name: newUser.name.trim(),
                email: newUser.email.trim(),
                role: newUser.role,
                fromEmail: newUser.fromEmail.trim() || undefined,
            });

            const invitedUser: User = {
                id: String(response?.id ?? response?.ID ?? response?.adminId ?? newUser.email),
                name: String(response?.name ?? newUser.name),
                email: String(response?.email ?? newUser.email),
                role: (response?.role ?? newUser.role) as Role,
                status: (response?.status ?? 'Pending Invite') as User['status'],
                lastLogin: '',
            };

            setAllUsers(prev => [...prev, invitedUser]);
            setToast({ message: 'Invitation sent successfully.', type: 'success' });
            setInviteModalOpen(false);
            setNewUser({ name: '', email: '', role: 'Receptionist', fromEmail: '' });
        } catch (err: any) {
            const message = err?.body?.error || err?.body?.message || err?.message || 'Failed to send invitation.';
            setToast({ message, type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (user: User) => {
        if (!canDelete) return;
        if (!window.confirm(`Remove ${user.name} from the system?`)) return;
        setToast(null);
        setIsDeleting(true);
        try {
            await adminsService.remove(String(user.id));
            setAllUsers(prev => prev.filter(u => u.id !== user.id));
            setToast({ message: 'User removed successfully.', type: 'success' });
        } catch (err: any) {
            const message = err?.body?.error || err?.body?.message || err?.message || 'Failed to remove user.';
            setToast({ message, type: 'error' });
        } finally {
            setIsDeleting(false);
        }
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
        { value: 'owner', label: 'Owner' },
        { value: 'Manager', label: 'Manager' },
        { value: 'Receptionist', label: 'Receptionist' },
        { value: 'Cleaner', label: 'Housekeeping' }, // Use Cleaner role but display as Housekeeping
    ];

    if (!canView) {
        return <AccessDenied message="You do not have permission to view users." />;
    }

    return (
        <div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
                <Button leftIcon={<PlusCircle />} onClick={() => setInviteModalOpen(true)} disabled={!canCreate}>
                    Add New User
                </Button>
            </div>

            <Table<User>
                columns={columns}
                data={allUsers}
                isScrollable={false}
                renderRowActions={(user) => (
                    <div className="flex items-center justify-center space-x-2">
                        <button title="Edit User" className="text-gray-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-gray-100 transition-colors">
                            <Edit size={18} />
                        </button>
                        <button
                            title="Remove User"
                            className="text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                            onClick={() => handleDeleteUser(user)}
                            disabled={isDeleting || !canDelete}
                        >
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
                    <Input id="fromEmail" label="From Email (optional)" type="email" value={newUser.fromEmail} onChange={handleInputChange} placeholder="e.g., admin@yourdomain.com" />
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
                            <Button type="submit" leftIcon={<Mail size={16}/>} disabled={isSubmitting} className={isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}>
                                {isSubmitting ? 'Sending...' : 'Send Invitation'}
                            </Button>
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
