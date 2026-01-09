import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, UserCircle, Calendar, Home, Mail, User } from 'lucide-react';
import Modal from './ui/Modal';
import { Customer } from '../../types';

interface BookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  mode: 'view' | 'edit';
  onUpdateCustomer: (updatedCustomer: Customer) => void;
}

// Helper function to format date
const formatDateOnly = (value?: string) => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Helper function to pick name
const pickDisplayName = (person: any) => {
  const n =
    person?.fullName ?? person?.name ?? person?.guestName ?? person?.guest_name ?? person?.firstName ?? person?.first_name ?? '';
  return String(n || '').trim() || '—';
};

// Helper function to normalize status text
const normalizeStatusText = (s: any) => {
  if (!s) return '—';
  return typeof s === 'string' ? s : String(s);
};

// Helper function to normalize guest list
const normalizeGuestList = (v: any): any[] => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

// Helper function to get check-in date
const getCheckIn = (c: any) =>
  c?.checkInDate ?? c?.check_in ?? c?.checkIn ?? c?.checkin ?? '';

// Helper function to get check-out date
const getCheckOut = (c: any) =>
  c?.checkOutDate ?? c?.check_out ?? c?.checkOut ?? c?.checkout ?? '';

// Helper function to check if customer is checked-in or later
const isCheckedInOrLater = (c: any) => {
  const s = String(c?.bookingStatus ?? c?.status ?? c?.booking?.status ?? "").toLowerCase();
  if (s.includes("checked-in") || s.includes("checkedin")) return true;
  if (s.includes("checked-out") || s.includes("checkedout")) return true;
  if (c?.checkinCompleted === true) return true;
  if (c?.checkedInAt) return true;
  return false;
};

// Status Badge component
const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  const base = 'px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide inline-flex items-center gap-1.5 transition-all';
  if (!status || status === '—') {
    return <span className={`${base} bg-gray-100 text-gray-500`}>—</span>;
  }

  if (['Checked-In', 'Confirmed', 'Paid'].includes(status)) {
    return (
      <span className={`${base} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        {status}
      </span>
    );
  }

  if (['Pending', 'Deposit Paid'].includes(status)) {
    return (
      <span className={`${base} bg-amber-50 text-amber-700 ring-1 ring-amber-200`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
        {status}
      </span>
    );
  }

  return <span className={`${base} bg-gray-50 text-gray-600 ring-1 ring-gray-200`}>{status}</span>;
};

// InfoBlock component
const InfoBlock: React.FC<{ label: string; value?: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="group flex flex-col gap-2.5 rounded-lg p-4 transition-all hover:bg-gray-50/50">
    <div className="flex items-center gap-2">
      {icon && <span className="text-gray-400 group-hover:text-blue-500 transition-colors">{icon}</span>}
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
    <span className="text-base text-gray-900 ml-6">{value || '—'}</span>
  </div>
);

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  isOpen,
  onClose,
  customer,
  mode,
  onUpdateCustomer,
}) => {
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [mainBookerEmail, setMainBookerEmail] = useState<string | null>(null);

  // Reset selection when modal is closed
  useEffect(() => {
    if (!isOpen) setSelectedGuestId(null);
  }, [isOpen]);

  useEffect(() => {
    if (!customer) return;

    if (mainBookerEmail === null) {
      setMainBookerEmail(customer.email);
    }

    const checked = isCheckedInOrLater(customer);

    // After check-in: select the first guest in the guest list
    if (checked) {
      setSelectedGuestId("g-0"); // Select the first guest from the guest list
      return;
    }

    // Before check-in: select the main booker
    setSelectedGuestId(`main-${(customer as any).id}`);
  }, [customer, mainBookerEmail]);

  const rawGuestList = useMemo(() => {
    if (!customer) return [];
    const candidate = (customer as any)?.guestList ?? (customer as any)?.guests ?? [];
    return normalizeGuestList(candidate);
  }, [customer]);
  const selectedPerson = useMemo(() => {
  if (!customer) return null;

  const mainId = `main-${(customer as any).id}`;

  // ถ้ายังไม่ได้เลือกแขกหรือเป็น Main Booker ให้ใช้ email ของ customer
  if (!selectedGuestId || selectedGuestId === mainId) {
    return { ...customer, email: customer.email }; // ใช้ email ของ customer โดยตรง
  }

  const idxMatch = selectedGuestId.match(/^g-(\d+)$/);
  if (idxMatch) {
    const idx = Number(idxMatch[1]);
    return rawGuestList?.[idx] ?? customer;
  }

  return customer;
}, [customer, selectedGuestId, rawGuestList]);

const guests = useMemo(() => {
  if (!customer) return [];

  const checked = isCheckedInOrLater(customer); // เช็คว่าเช็กอินแล้วหรือยัง

  // Main Booker จะถูกเลือกจาก rawGuestList
  const listFromGuests = rawGuestList.map((g: any, idx: number) => {
    const display = pickDisplayName(g);
    return {
      id: `g-${idx}`,
      name: display !== "—" ? display : `Guest ${idx + 1}`,
      role: g?.type ? `Guest (${g.type})` : "Guest",
      email: g?.email || customer.email, // หากแขกไม่มี email ใช้ email จาก customer
    };
  });

  // ถ้าเช็กอินแล้ว จะจะแสดงเฉพาะจาก guest list และเปลี่ยนชื่อจาก Guest เป็น Main Booker
  if (checked) {
    return listFromGuests.map((guest) => ({
      ...guest,
      name: guest.name === "Guest 1" ? "Main Booker" : guest.name, // เปลี่ยนชื่อจาก "Guest 1" เป็น "Main Booker"
      email: customer.email, // ยืนยันว่าอีเมลจะยังคงเป็นของ customer
    }));
  }

  // ถ้ายังไม่เช็กอิน จะแสดง Main Booker เป็นคนแรก
  return [{ id: `main-${(customer as any).id}`, name: "Main Booker", role: "Main Booker", email: customer.email }, ...listFromGuests];
}, [customer, rawGuestList]);

  const roomsText = useMemo(() => {
    if (!customer) return '—';
    const rooms = Array.isArray((customer as any).roomStays) ? (customer as any).roomStays : [];
    return rooms.map((r: any) => r?.roomNumber).filter(Boolean).join(', ') || '—';
  }, [customer]);

  const bookingStatusText = useMemo(() => {
    if (!customer) return '—';
    const rooms = Array.isArray((customer as any).roomStays) ? (customer as any).roomStays : [];
    return normalizeStatusText((customer as any).bookingStatus ?? rooms?.[0]?.bookingStatus);
  }, [customer]);

  const stayPeriodText = useMemo(() => {
    const ci = getCheckIn(customer as any);
    const co = getCheckOut(customer as any);
    return ci && co ? `${formatDateOnly(ci)} - ${formatDateOnly(co)}` : '—';
  }, [customer]);

  if (!customer) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="5xl" title={<div className="flex w-full items-center gap-4 pr-8"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30"><ShieldCheck className="text-white" size={24} /></div><div><h2 className="font-semibold text-gray-900">Booking Details</h2><div className="mt-0.5 flex items-center gap-2"><span className="text-xs font-medium text-gray-500">Reference</span><span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">#{(customer as any).bookingId}</span></div></div></div>}>
      <div className="-mx-6 -mb-6 bg-gradient-to-br from-gray-50 to-white">
        <div className="flex min-h-[480px]">
          {/* LEFT - Guest List */}
          <aside className="w-1/3 border-r border-gray-200 bg-white px-6 py-8">
            <div className="mb-6 flex items-center gap-2">
              <User size={18} className="text-gray-400" />
              <h4 className="font-semibold text-gray-700">Guest List</h4>
              <span className="ml-auto rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                {guests.length}
              </span>
            </div>

            <div className="space-y-3">
              {guests.map((g) => {
                const isActive = selectedGuestId === String(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGuestId(String(g.id))}
                    className={['group w-full rounded-xl p-4 text-left transition-all duration-200', isActive ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-[1.02]' : 'border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 hover:shadow-md'].join(' ')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={['flex h-10 w-10 items-center justify-center rounded-full transition-all', isActive ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-blue-50'].join(' ')}>
                        <UserCircle size={20} className={isActive ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={['truncate font-semibold transition-colors', isActive ? 'text-white' : 'text-gray-900'].join(' ')}>
                          {g.name || '—'}
                        </div>
                        <div className={['mt-0.5 text-xs font-medium', isActive ? 'text-blue-100' : 'text-gray-500'].join(' ')}>
                          {g.role}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* RIGHT - Guest Details */}
          <section className="w-2/3 px-10 py-8">
            <div className="mb-8 flex items-center gap-3 border-b border-gray-200 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <UserCircle size={20} className="text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-800">Guest Information</h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <InfoBlock label="Full Name" value={pickDisplayName(selectedPerson)} icon={<User size={16} />} />
              <InfoBlock label="Email" value={selectedPerson?.email || '—'} icon={<Mail size={16} />} />
              <InfoBlock label="Rooms" value={roomsText} icon={<Home size={16} />} />
              <InfoBlock label="Stay Period" value={stayPeriodText} icon={<Calendar size={16} />} />
              <div className="col-span-2 mt-4">
                <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Booking Status</span>
                      <div className="mt-3">
                        <StatusBadge status={bookingStatusText} />
                      </div>
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-blue-100">
                      <ShieldCheck size={28} className="text-blue-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
};

export default BookingDetailsModal;
