import { useCallback, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Role, RolePermissions } from '../types';

const buildEmptyPermissions = (): RolePermissions => ({
  bookingManagement: {
    view: false,
    create: false,
    edit: false,
    delete: false,
    editStatus: false,
    submit: false,
    verify: false,
    export: false,
  },
  roomManagement: {
    view: false,
    create: false,
    edit: false,
    delete: false,
    editStatus: false,
    submit: false,
    verify: false,
    export: false,
  },
  customerList: {
    view: false,
    create: false,
    edit: false,
    delete: false,
    editStatus: false,
    submit: false,
    verify: false,
    export: false,
  },
  tm30Verification: {
    view: false,
    create: false,
    edit: false,
    delete: false,
    editStatus: false,
    submit: false,
    verify: false,
    export: false,
  },
  rolesAndPermissions: {
    view: false,
    create: false,
    edit: false,
    delete: false,
    editStatus: false,
    submit: false,
    verify: false,
    export: false,
  },
});

export const usePermissions = () => {
  const { roles, allUsers } = useData();

  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('auth_admin');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const adminId = String(parsed?.id ?? '');
      const adminEmail = String(parsed?.username ?? '').trim().toLowerCase();

      return (
        allUsers.find(
          (u) =>
            (adminId && String(u.id) === adminId) ||
            (adminEmail && u.email.trim().toLowerCase() === adminEmail)
        ) || null
      );
    } catch {
      return null;
    }
  }, [allUsers]);

  const role: Role = (currentUser?.role as Role) ?? 'Receptionist';

  const permissions = useMemo(() => {
    const roleEntry = roles.find((r) => r.name === role);
    return roleEntry?.permissions ?? buildEmptyPermissions();
  }, [roles, role]);

  const can = useCallback(
    (module: keyof RolePermissions, action: keyof RolePermissions[keyof RolePermissions]) => {
      const mod = permissions?.[module];
      return Boolean(mod && (mod as any)[action]);
    },
    [permissions]
  );

  return {
    role,
    permissions,
    can,
    isOwner: role === 'owner',
  };
};

