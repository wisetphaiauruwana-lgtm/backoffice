import React from 'react';
import { Bell, User } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="h-20 px-6 bg-white border-b border-gray-200 flex items-center justify-end">
      <div className="flex items-center gap-6">
        {/* Notification */}
        <button className="relative text-gray-500 hover:text-blue-600 transition">
          <Bell className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>

          <div className="leading-tight">
            <p className="text-sm font-semibold text-gray-800">Admin User</p>
            <p className="text-xs text-gray-500">admin@horizon.com</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
