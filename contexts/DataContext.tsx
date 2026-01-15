import React, { createContext, useContext, useEffect, useState } from 'react';
import { Room, Customer, RoleDetails, RolePermissions, User, Role } from '../types';
import { rolesService } from '../services/roles.service';
import { adminsService } from '../services/admins.service';

export type DataContextType = {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;

  bookings: Customer[];
  setBookings: React.Dispatch<React.SetStateAction<Customer[]>>;

  rooms: Room[];
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>;

  roles: RoleDetails[];
  setRoles: React.Dispatch<React.SetStateAction<RoleDetails[]>>;

  allUsers: User[];
  setAllUsers: React.Dispatch<React.SetStateAction<User[]>>;
};

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Customer[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roles, setRoles] = useState<RoleDetails[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const normalizeRoleName = (rawName: unknown): Role => {
    const name = String(rawName ?? "").trim().toLowerCase();
    if (name === "owner") return "owner";
    if (name === "manager") return "Manager";
    if (name === "receptionist") return "Receptionist";
    if (name === "cleaner") return "Cleaner";
    return "Receptionist";
  };

  const createDefaultPermissions = (): RolePermissions => ({
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
    emailManagement: {
      view: false,
      send: false,
      config: false,
    },
    roomAccess: {
      view: false,
      reset: false,
    },
    auditLogs: {
      view: false,
      export: false,
    },
  });

  const ensureDefaultRoles = (rolesList: RoleDetails[]): RoleDetails[] => {
    const requiredRoles: Role[] = ["owner", "Manager", "Receptionist", "Cleaner"];
    const rolesByName = new Map(rolesList.map((role) => [role.name, role]));
    const merged = [...rolesList];

    requiredRoles.forEach((roleName) => {
      if (!rolesByName.has(roleName)) {
        merged.push({
          id: `local-${roleName}`,
          name: roleName,
          description: "",
          members: [],
          permissions: createDefaultPermissions(),
        });
      }
    });

    return merged;
  };

  useEffect(() => {
    const loadRolesAndUsers = async () => {
      try {
        const [rolesResponse, adminsResponse] = await Promise.all([
          rolesService.fetchAll(),
          adminsService.fetchAll(),
        ]);

        const normalizedRoles: RoleDetails[] = (Array.isArray(rolesResponse) ? rolesResponse : []).map((role) => {
          const members = Array.isArray(role?.members) ? role.members : [];
          const normalizedRoleName = normalizeRoleName(role?.name);
          const normalizedMembers: User[] = members.map((m: any) => ({
            id: String(m?.id ?? ""),
            name: String(m?.name ?? "Unknown"),
            email: String(m?.email ?? ""),
            role: normalizedRoleName,
            status: "Active",
            lastLogin: "",
          }));

          return {
            id: String(role?.id ?? ""),
            name: normalizedRoleName,
            description: role?.description ?? "",
            members: normalizedMembers,
            permissions: (role?.permissions ?? {}) as RolePermissions,
          };
        });

        setRoles(ensureDefaultRoles(normalizedRoles));

        const roleByAdminId = new Map<string, Role>();
        normalizedRoles.forEach((role) => {
          (role.members ?? []).forEach((member) => {
            roleByAdminId.set(String(member.id), role.name);
          });
        });

        const normalizedUsers: User[] = (Array.isArray(adminsResponse) ? adminsResponse : []).map((admin: any) => {
          const adminId = String(admin?.id ?? admin?.ID ?? "");
          return {
            id: adminId,
            name: String(admin?.full_name ?? admin?.fullName ?? admin?.name ?? admin?.username ?? "Unknown"),
            email: String(admin?.username ?? ""),
            role: roleByAdminId.get(adminId) ?? "Receptionist",
            status: "Active",
            lastLogin: "",
          };
        });

        setAllUsers(normalizedUsers);
      } catch (error) {
        console.warn("Failed to load roles/users", error);
      }
    };

    loadRolesAndUsers();
  }, []);

  return (
    <DataContext.Provider
      value={{
        customers,
        setCustomers,
        bookings,
        setBookings,
        rooms,
        setRooms,
        roles,
        setRoles,
        allUsers,
        setAllUsers,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
