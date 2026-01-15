
import React, { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Role, RoleDetails, RolePermissions, User } from '../types';
import Button from './ui/Button';
import Modal from './ui/Modal';
import ConfirmationModal from './ui/ConfirmationModal';
import { PlusCircle, Save, ShieldCheck, Users } from 'lucide-react';
import { rolesService } from '../services/roles.service';
import { usePermissions } from '../hooks/usePermissions';
import AccessDenied from './ui/AccessDenied';

type PermissionModule = keyof RolePermissions;
type PermissionAction = keyof RolePermissions[PermissionModule];

const permissionModuleLabels: Record<PermissionModule, string> = {
    bookingManagement: 'Booking Management',
    roomManagement: 'Room Management',
    customerList: 'Customer List',
    tm30Verification: 'TM.30 Verification',
    rolesAndPermissions: 'Roles & Permissions',
    emailManagement: 'Email Management',
    roomAccess: 'Room Access',
    auditLogs: 'Audit Logs',
};

const permissionActionLabels: Record<string, string> = {
    view: 'View',
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete',
    editStatus: 'Edit Status',
    submit: 'Submit',
    verify: 'Verify',
    export: 'Export Data',
    send: 'Send',
    config: 'Config',
    reset: 'Reset',
};

const ROLE_ORDER: Role[] = ['owner', 'Manager', 'Receptionist', 'Cleaner'];
const roleDisplayLabels: Partial<Record<Role, string>> = {
    owner: 'Owner',
};

const getRoleLabel = (role: Role) => roleDisplayLabels[role] ?? role;

const PermissionCheckbox: React.FC<{
    checked: boolean;
    onChange: () => void;
    label: string;
    disabled?: boolean;
}> = ({ checked, onChange, label, disabled = false }) => (
    <label className={`flex items-center space-x-3 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
        <input
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:bg-gray-200"
        />
        <span className="text-sm text-gray-700">{label}</span>
    </label>
);

const PermissionGroup: React.FC<{
    title: string;
    permissions: Record<string, boolean>;

    onPermissionChange: (action: PermissionAction, value: boolean) => void;
    onSelectAll: (value: boolean) => void;
    disabled?: boolean;
}> = ({ title, permissions, onPermissionChange, onSelectAll, disabled = false }) => {
    const allChecked = useMemo(() => Object.values(permissions).every(p => p === true), [permissions]);
    const isIndeterminate = useMemo(() => !allChecked && Object.values(permissions).some(p => p === true), [permissions, allChecked]);

    const handleSelectAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSelectAll(e.target.checked);
    };

    return (
        <div className="space-y-3 p-4 border rounded-lg bg-gray-50/50">
            <div className="flex justify-between items-center pb-2 border-b">
                <h4 className="font-semibold text-gray-800">{title}</h4>
                <label className={`flex items-center space-x-2 text-sm font-medium text-gray-600 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                    <input
                        type="checkbox"
                        checked={allChecked}
                        ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                        onChange={handleSelectAllChange}
                        disabled={disabled}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Select All</span>
                </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 pt-2">
                {Object.keys(permissionActionLabels).map(action => {
                    if (action in permissions) {
                        return (
                            <PermissionCheckbox
                                key={action}
                                label={permissionActionLabels[action]}
                                checked={permissions[action as PermissionAction] || false}
                                onChange={() => onPermissionChange(action as PermissionAction, !permissions[action as PermissionAction])}
                                disabled={disabled}
                            />
                        );
                    }
                    return null;
                })}
            </div>
        </div>
    );
};

const RolesAndPermissions: React.FC = () => {
    const data = useData();
    const { can } = usePermissions();
    const canView = can('rolesAndPermissions', 'view');

    if (
        !data ||
        !Array.isArray(data.roles) ||
        data.roles.length === 0 ||
        !Array.isArray(data.allUsers)
    ) {
        return (
            <div className="p-6 text-center text-gray-500">
                Loading roles & permissions...
            </div>
        );
    }

    if (!canView) {
        return <AccessDenied message="You do not have permission to view roles & permissions." />;
    }

    const { roles, setRoles, allUsers } = data;

    const isOwner = useMemo(() => {
        try {
            const raw = localStorage.getItem('auth_admin');
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            const adminId = String(parsed?.id ?? '');
            const adminEmail = String(parsed?.username ?? '').trim().toLowerCase();
            const matched = allUsers.find(u =>
                (adminId && String(u.id) === adminId) ||
                (adminEmail && u.email.trim().toLowerCase() === adminEmail)
            );
            return matched?.role === 'owner';
        } catch {
            return false;
        }
    }, [allUsers]);


    const initialRole = useMemo(() => roles[0], [roles]);

    const [selectedRole, setSelectedRole] = useState<RoleDetails>(initialRole);
    const [editedPermissions, setEditedPermissions] = useState<RolePermissions>(
        initialRole.permissions
    );

    const [activeTab, setActiveTab] = useState<'permissions' | 'users'>('permissions');

    const [userToRemove, setUserToRemove] = useState<User | null>(null);
    const [isAssignUserModalOpen, setAssignUserModalOpen] = useState(false);

    const usersNotInRole = useMemo(() => {
        const memberIds = new Set(selectedRole.members.map(m => m.id));
        return allUsers.filter(u => !memberIds.has(u.id));
    }, [allUsers, selectedRole]);

    const orderedRoles = useMemo(() => {
        const byName = new Map(roles.map((role) => [role.name, role]));
        const ordered = ROLE_ORDER.map((name) => byName.get(name)).filter(Boolean) as RoleDetails[];
        return ordered;
    }, [roles]);

    const handleSelectRole = (role: RoleDetails) => {
        setSelectedRole(role);
        setEditedPermissions(role.permissions);
        setActiveTab('permissions');
    };

    const handlePermissionChange = (module: PermissionModule, action: PermissionAction, value: boolean) => {
        if (!isOwner) return;
        setEditedPermissions(prev => ({
            ...prev,
            [module]: {
                ...prev[module],
                [action]: value,
            }
        }));
    };

    const handleSelectAll = (module: PermissionModule, value: boolean) => {
        if (!isOwner) return;
        setEditedPermissions(prev => {
            const newModulePermissions = { ...prev[module] };
            Object.keys(newModulePermissions).forEach(key => {
                (newModulePermissions as any)[key] = value;
            });
            return { ...prev, [module]: newModulePermissions };
        });
    };

const handleSaveChanges = () => {
        if (!isOwner) return;
        const roleIdRaw = String(selectedRole.id ?? "").trim();
        if (!/^\d+$/.test(roleIdRaw)) {
            alert("Cannot save: role ID is not a backend ID. Please select a role loaded from the server.");
            return;
        }

        const flattenPermissions = (permissions: RolePermissions): string[] => {
            const result: string[] = [];
            Object.entries(permissions).forEach(([module, actions]) => {
                Object.entries(actions).forEach(([action, enabled]) => {
                    if (enabled) result.push(`${module}.${action}`);
                });
            });
            return result;
        };

        rolesService
            .updatePermissions(roleIdRaw, flattenPermissions(editedPermissions))
            .then(() => {
                setRoles(prevRoles => prevRoles.map(role =>
                    role.id === selectedRole.id ? { ...role, permissions: editedPermissions } : role
                ));
                setSelectedRole(prev => ({ ...prev, permissions: editedPermissions }));
                alert('Changes saved successfully!');
            })
            .catch((err) => {
                console.error(err);
                alert('Failed to save permissions');
            });
    };

    const handleConfirmRemoveUser = () => {
        if (!isOwner) return;
        if (userToRemove) {
            const updatedMembers = selectedRole.members.filter(m => m.id !== userToRemove.id);
            const updatedRole = { ...selectedRole, members: updatedMembers };
            setRoles(prev => prev.map(r => r.id === selectedRole.id ? updatedRole : r));
            setSelectedRole(updatedRole);
            setUserToRemove(null);
        }
    };

    const handleAssignUser = (user: User) => {
        if (!isOwner) return;
        const updatedMembers = [...selectedRole.members, user];
        const updatedRole = { ...selectedRole, members: updatedMembers };
        setRoles(prev => prev.map(r => r.id === selectedRole.id ? updatedRole : r));
        setSelectedRole(updatedRole);
        setAssignUserModalOpen(false);
    };

    return (
        <div className="flex flex-col h-full">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Roles & Permissions</h1>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
                {/* Left Sidebar: Roles List */}
                <div className="lg:col-span-1 bg-white p-4 rounded-xl shadow-sm flex flex-col">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4 px-2">Roles</h2>
                    <div className="flex-1 space-y-1 overflow-y-auto scrollbar-none">
                        {orderedRoles.map(role => (
                            <button
                                key={role.id}
                                onClick={() => handleSelectRole(role)}
                                className={`w-full text-left px-4 py-2.5 rounded-lg transition-colors text-sm font-medium ${selectedRole.id === role.id ? 'bg-blue-600 text-white shadow' : 'hover:bg-gray-100 text-gray-700'}`}
                            >
                                {getRoleLabel(role.name)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right Content Area: Details */}
                <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm flex flex-col min-h-0">
                    <div className="flex justify-between items-start pb-4 border-b">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center">{getRoleLabel(selectedRole.name)}</h2>
                            <p className="text-sm text-gray-500 mt-1">{selectedRole.description}</p>
                        </div>
                    </div>

                    <div className="mt-4 flex border-b">
                        <button onClick={() => setActiveTab('permissions')} className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'permissions' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}><ShieldCheck size={16} className="inline-block mr-2" />Permissions</button>
                        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === 'users' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                            <Users size={16} className="inline-block mr-2" />
                            Assigned Users
                            <span className="absolute top-1 right-1 text-xs bg-blue-100 text-blue-800 font-semibold rounded-full px-2 py-0.5">{selectedRole.members.length}</span>
                        </button>
                    </div>

                    <div className="flex-1 py-6 space-y-4 overflow-y-auto scrollbar-none">
                        {activeTab === 'permissions' && (
                            Object.keys(editedPermissions).map(moduleKey => (
                                <PermissionGroup
                                    key={moduleKey}
                                    title={permissionModuleLabels[moduleKey as PermissionModule]}
                                    permissions={editedPermissions[moduleKey as PermissionModule]}
                                    onPermissionChange={(action, value) => handlePermissionChange(moduleKey as PermissionModule, action, value)}
                                    onSelectAll={(value) => handleSelectAll(moduleKey as PermissionModule, value)}
                                    disabled={!isOwner}
                                />
                            ))
                        )}
                        {activeTab === 'users' && (
                            <div>
                                <Button leftIcon={<PlusCircle size={18} />} onClick={() => setAssignUserModalOpen(true)} disabled={!isOwner}>Assign User</Button>
                                <div className="mt-4 border rounded-lg overflow-hidden">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-medium text-gray-600">Name</th>
                                                <th className="px-4 py-2 text-left font-medium text-gray-600">Email</th>
                                                <th className="px-4 py-2 text-center font-medium text-gray-600">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {selectedRole.members.map(member => (
                                                <tr key={member.id}>
                                                    <td className="px-4 py-2 font-medium text-gray-800">{member.name}</td>
                                                    <td className="px-4 py-2 text-gray-600">{member.email}</td>
                                                    <td className="px-4 py-2 text-center">
                                                        <button onClick={() => setUserToRemove(member)} className={`font-medium hover:underline ${isOwner ? 'text-red-600 hover:text-red-800' : 'text-gray-400 cursor-not-allowed'}`} disabled={!isOwner}>
                                                            Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {selectedRole.members.length === 0 && (
                                                <tr><td colSpan={3} className="text-center py-4 text-gray-500">No users assigned to this role.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {activeTab === 'permissions' && (
                        <div className="mt-auto pt-4 border-t flex justify-end">
                            <Button leftIcon={<Save />} onClick={handleSaveChanges} disabled={!isOwner}>
                                Save Changes
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={!!userToRemove}
                onClose={() => setUserToRemove(null)}
                onConfirm={handleConfirmRemoveUser}
                title={`Remove User from Role`}
                message={`Are you sure you want to remove ${userToRemove?.name} from the ${getRoleLabel(selectedRole.name)} role?`}
            />

            <Modal isOpen={isAssignUserModalOpen} onClose={() => setAssignUserModalOpen(false)} title={`Assign User to ${getRoleLabel(selectedRole.name)}`}>
                <div className="max-h-96 overflow-y-auto">
                    {usersNotInRole.length > 0 ? (
                        <ul className="divide-y">
                            {usersNotInRole.map(user => (
                                <li key={user.id} className="py-2 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">{user.name}</p>
                                        <p className="text-sm text-gray-500">{user.email}</p>
                                    </div>
                                    <Button size="sm" onClick={() => handleAssignUser(user)}>Assign</Button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 py-4">All users are already assigned to this role.</p>
                    )}
                </div>
            </Modal>
        </div> 
    );
};

export default RolesAndPermissions;
