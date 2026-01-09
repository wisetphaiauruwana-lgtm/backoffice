import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BedDouble,
  User,
  ShieldCheck,
  LogOut,
  Hotel,
  CalendarCheck,
  FileText,
  Settings,
} from 'lucide-react';

interface SidebarProps {
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/bookings', icon: CalendarCheck, label: 'Bookings' },
    { to: '/rooms', icon: BedDouble, label: 'Room Management' },
    { to: '/customers', icon: User, label: 'Customer List' },
    { to: '/reports', icon: FileText, label: 'Gov Reports' },
    { to: '/roles', icon: ShieldCheck, label: 'Roles & Permissions' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `
    group flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
    transition-all duration-200
    ${
      isActive
        ? 'bg-blue-600 text-white shadow-md'
        : 'text-blue-100 hover:bg-blue-700 hover:text-white'
    }
  `;

  return (
    <aside className="w-64 bg-blue-900 text-white flex flex-col">
      {/* Logo */}
      <div className="h-20 flex items-center justify-center border-b border-blue-800">
        <Hotel className="w-8 h-8 text-blue-300 mr-2" />
        <span className="text-xl font-bold tracking-widest">HORIZON</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} className={navLinkClasses}>
            <item.icon className="w-5 h-5 opacity-80 group-hover:opacity-100" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-blue-800">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium
                     text-blue-100 hover:bg-red-600 hover:text-white transition-all"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
