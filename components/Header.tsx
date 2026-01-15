import React, { useEffect, useMemo, useState } from 'react';
import { Bell, User } from 'lucide-react';
import { useBookings } from '../contexts/BookingsContext';
import { BookingStatus } from '../types';

const Header: React.FC = () => {
  const [displayName, setDisplayName] = useState('Admin');
  const [displayEmail, setDisplayEmail] = useState('—');
  const { bookings } = useBookings();

  const getLocalDateISO = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const dateOnly = (value?: string) => {
    if (!value) return undefined;
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return undefined;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const normalizeStatus = (status: unknown): BookingStatus => {
    const s = String(status ?? '').toLowerCase().replace(/[\s-_]/g, '');
    if (s === 'checkedin') return BookingStatus.CheckedIn;
    if (s === 'checkedout') return BookingStatus.CheckedOut;
    if (s === 'confirmed') return BookingStatus.Confirmed;
    if (s === 'pending') return BookingStatus.Pending;
    if (s === 'cancelled' || s === 'canceled') return BookingStatus.Cancelled;
    // @ts-expect-error runtime guard
    if (Object.values(BookingStatus).includes(status)) return status as BookingStatus;
    return BookingStatus.Pending;
  };

  useEffect(() => {
    const stored = localStorage.getItem('auth_admin');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const name = parsed?.full_name || parsed?.fullName || parsed?.name;
        const email = parsed?.username || parsed?.email;
        if (name) setDisplayName(String(name));
        if (email) setDisplayEmail(String(email));
        return;
      } catch {
        // ignore parsing errors and fall back
      }
    }

    const remembered = localStorage.getItem('remembered_email');
    if (remembered) {
      setDisplayEmail(remembered);
    }
  }, []);

  const { todayCheckIns, todayCheckOuts, totalNotifications } = useMemo(() => {
    const today = getLocalDateISO();
    let checkIns = 0;
    let checkOuts = 0;

    (bookings ?? []).forEach((b: any) => {
      const status = normalizeStatus(b?.status);
      const checkInDate = b?.checkInDate ?? b?.check_in;
      const checkOutDate = b?.checkOutDate ?? b?.check_out;

      if (status === BookingStatus.CheckedIn && dateOnly(checkInDate) === today) {
        checkIns += 1;
      }
      if (status === BookingStatus.CheckedOut && dateOnly(checkOutDate) === today) {
        checkOuts += 1;
      }
    });

    return {
      todayCheckIns: checkIns,
      todayCheckOuts: checkOuts,
      totalNotifications: checkIns + checkOuts,
    };
  }, [bookings]);

  return (
    <header className="h-20 px-6 bg-white border-b border-gray-200 flex items-center justify-end">
      <div className="flex items-center gap-6">
        {/* Notification */}
        <button
          className="relative text-gray-500 hover:text-blue-600 transition"
          aria-label={`Notifications: ${totalNotifications}`}
          title={`Check-ins today: ${todayCheckIns} • Check-outs today: ${todayCheckOuts}`}
        >
          <Bell className="w-6 h-6" />
          {totalNotifications > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
              {totalNotifications}
            </span>
          )}
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>

          <div className="leading-tight">
            <p className="text-sm font-semibold text-gray-800">{displayName}</p>
            <p className="text-xs text-gray-500">{displayEmail}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
