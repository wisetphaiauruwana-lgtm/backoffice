// src/components/BookingManagement.tsx
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Table from './ui/Table';

import { BookingStatus, Guest, Customer } from '../types';
import { useBookings } from '../contexts/BookingsContext';

import ConfirmationModal from './ui/ConfirmationModal';
import BookingDetailsModal from './BookingDetailsModal';
import Toast from './ui/Toast';
import AccessDenied from './ui/AccessDenied';

import { Eye, Trash2, Search, PlusCircle, Calendar, Users, Filter, X } from 'lucide-react';
import Button from './ui/Button';

import { bookingsService } from '../services/bookings.service';
import { guestsService } from "../services/guests.service";
import { usePermissions } from '../hooks/usePermissions';

/* ===========================
   Types
=========================== */

type FlatBookingRow = {
  id: string; // unique row id
  bookingId: number; // real booking id
  customerId?: number;
  fullName?: string;
  email?: string;
  roomNumbers?: string;

  bookingStatus: BookingStatus;
  checkInDate?: string;
  checkOutDate?: string;
  adults?: number;
  children?: number;
  guestList?: Guest[];
};

/* ===========================
   Utils
=========================== */

const DEBOUNCE_MS = 300;

const parseLocalDateValue = (value: string): Date | null => {
  if (!value) return null;
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const y = Number(dateOnlyMatch[1]);
    const m = Number(dateOnlyMatch[2]);
    const d = Number(dateOnlyMatch[3]);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateOnly = (value?: string): string => {
  if (!value) return '';
  const d = parseLocalDateValue(value);
  if (!d) return '';

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const normalizeBookingStatus = (status: string): BookingStatus => {
  switch ((status ?? '').toLowerCase()) {
    case 'confirmed':
    case 'confirm':
      return BookingStatus.Confirmed;

    case 'pending':
      return BookingStatus.Pending;

    case 'checked-in':
    case 'checkedin':
      return BookingStatus.CheckedIn;

    case 'checked-out':
    case 'checkedout':
      return BookingStatus.CheckedOut;

    case 'cancelled':
    case 'canceled':
      return BookingStatus.Cancelled;

    default:
      return BookingStatus.Confirmed;
  }
};

const getBookingKey = (b: any): number => {
  const raw = b?.id ?? b?.ID ?? b?.bookingId ?? 0;
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
};

const toStartOfDay = (dateStr: string) => {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
};

const toEndOfDay = (dateStr: string) => {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d;
};

// ✅ helper: normalize guest list (array หรือ string json)
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

// ✅ helper: pick display name from many possible keys
const resolveFullName = (obj: any, fallback?: string) => {
  const name =
    obj?.fullName ?? 
    obj?.full_name ?? 
    obj?.customer_name ?? 
    obj?.name ?? 
    (obj?.first_name && obj?.last_name ? `${obj.first_name} ${obj.last_name}` : undefined) ?? 
    obj?.firstName ?? 
    obj?.first_name ?? 
    fallback ?? 
    '—';

  return String(name || '').trim() || (fallback ?? '—');
};

// ✅ เพิ่มตรงนี้เลย (ใต้ resolveFullName)
const isCheckedInOrLater = (b: any) => {
  const s = String(b?.status ?? b?.bookingStatus ?? "").toLowerCase();

  if (s.includes("checked-in") || s.includes("checkedin")) return true;
  if (s.includes("checked-out") || s.includes("checkedout")) return true;

  if (b?.checkinCompleted === true) return true;
  if (b?.checkedInAt) return true;

  return false;
};

const mapGuestsFromApiToGuestList = (apiGuests: any[]) => {
  const list = Array.isArray(apiGuests) ? apiGuests : [];

  return list
    .map((g: any) => {
      const name =
        g?.fullName ?? 
        g?.full_name ?? 
        g?.name ?? 
        [g?.firstName ?? g?.first_name, g?.lastName ?? g?.last_name].filter(Boolean).join(" ");

      return {
        // keep shape simple (modal แค่โชว์ชื่อส่วนมาก)
        name: String(name || "").trim() || "—",

        // เผื่อ modal มีใช้ field อื่น
        id: g?.id ?? g?.guestId ?? g?.guest_id,
        documentNumber: g?.documentNumber ?? g?.document_number ?? g?.id_number,
        nationality: g?.nationality,
      };
    })
    .filter((x: any) => x.name && x.name !== "—");
};

/* ===========================
   Component
=========================== */

const BookingManagement: React.FC = () => {
  const { bookings, setBookings, refreshBookings } = useBookings();
  const navigate = useNavigate();
  const location = useLocation();
  const { can } = usePermissions();
  const canView = can('bookingManagement', 'view');
  const canCreate = can('bookingManagement', 'create');
  const canDelete = can('bookingManagement', 'delete');
  const denyView = !canView;

  useEffect(() => {
    refreshBookings();
  }, [refreshBookings]);

  useEffect(() => {
    const filter = (location.state as any)?.statusFilter;
    const dateFilter = (location.state as any)?.dateFilter;
    if (!filter && !dateFilter) return;

    if (filter) {
      setStatusFilter(filter);
    }
    if (dateFilter) {
      setDateRange({ start: dateFilter, end: dateFilter });
    }
    setCurrentPage(1);
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  const [statusFilter, setStatusFilter] = useState<'Current & Upcoming' | BookingStatus | 'All'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const [bookingToDelete, setBookingToDelete] = useState<FlatBookingRow | null>(null);
  const [customerForModal, setCustomerForModal] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const debounceTimerRef = useRef<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [guestCountByBookingId, setGuestCountByBookingId] = useState<Record<number, number>>({});
  const [apiGuests, setApiGuests] = useState<any[]>([]);

  useEffect(() => {
    let isActive = true;
    guestsService
      .fetchAll()
      .then((list) => {
        if (isActive) setApiGuests(list ?? []);
      })
      .catch((err) => {
        console.warn("[BookingManagement] fetchAll guests failed", err);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const mainGuestNameByBookingId = useMemo(() => {
    const map: Record<string, string> = {};
    const grouped = new Map<string, any[]>();

    (apiGuests ?? []).forEach((g: any) => {
      const bookingId = String(g?.bookingId ?? g?.booking_id ?? "").trim();
      if (!bookingId) return;
      const list = grouped.get(bookingId) ?? [];
      list.push(g);
      grouped.set(bookingId, list);
    });

    grouped.forEach((list, bookingId) => {
      const main =
        list.find((g: any) => g?.isMainGuest === true) ??
        list.find((g: any) => String(g?.is_main_guest ?? "").toLowerCase() === "true") ??
        list[0];

      const name = resolveFullName(main);
      if (name && name !== "—") {
        map[bookingId] = name;
      }
    });

    return map;
  }, [apiGuests]);

  /* ===========================
     Flatten bookings -> rows
  =========================== */

  const flattenedBookings: FlatBookingRow[] = useMemo(() => {
    return (bookings ?? []).map((booking: any, bookingIndex: number) => {
      const bookingId = getBookingKey(booking);
      const safeBookingId = bookingId || Number(`99${bookingIndex}`);

      const rooms = Array.isArray(booking?.rooms) ? booking.rooms : [];

      const roomNumbers = rooms
        .map((r: any) =>
          r?.room?.roomCode ??
          r?.room?.roomNumber ??
          r?.room?.room_code ??
          r?.room?.roomNo ??
          r?.roomCode ??
          r?.roomNumber ??
          r?.room_code ??
          r?.roomNo
        )
        .filter(Boolean)
        .join(', ');

      const adults = Number(booking?.guests?.adults ?? booking?.adults ?? 0) || 0;
      const children = Number(booking?.guests?.children ?? booking?.children ?? 0) || 0;

      const rawGuestList =
        booking?.guest_list ?? 
        booking?.guestList ?? 
        booking?.accompanyingGuests ??     // ✅ เพิ่ม
        booking?.accompanying_guests ??    // ✅ เพิ่ม
        booking?.customer?.guestList ?? 
        booking?.customer?.guest_list ?? 
        booking?.guests ?? 
        [];

      const guestList = normalizeGuestList(rawGuestList);

      const customerObj = booking?.customer ?? {};
      const status = normalizeBookingStatus(booking?.status ?? booking?.bookingStatus ?? booking?.booking_status);
      const key = String(bookingId || safeBookingId);
      const mainGuestName =
        (status === BookingStatus.CheckedIn || status === BookingStatus.CheckedOut)
          ? mainGuestNameByBookingId[key]
          : undefined;

      return {
        id: `booking-${safeBookingId}`,
        bookingId: bookingId || safeBookingId,
        customerId: customerObj?.id ?? booking?.customerId,
        fullName: mainGuestName ?? resolveFullName(customerObj, booking?.customer_name ?? booking?.full_name ?? booking?.fullName),
        email: customerObj?.email ?? booking?.email,
        roomNumbers: roomNumbers || 'N/A',
        bookingStatus: status,
        checkInDate: formatDateOnly(booking?.checkInDate ?? booking?.check_in),
        checkOutDate: formatDateOnly(booking?.checkOutDate ?? booking?.check_out),
        adults,
        children,
        guestList,
      } as FlatBookingRow;
    });
  }, [bookings, mainGuestNameByBookingId]);

  /* ===========================
     Debounce Search
  =========================== */

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim().toLowerCase());
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchTerm]);

  /* ===========================
     Filters
  =========================== */

  const filteredBookings = useMemo(() => {
    let data = [...flattenedBookings];

    // ✅ ตัด Pending ออกถาวร (เผื่อ backend ยังส่งมา)
    data = data.filter((b) => b.bookingStatus !== BookingStatus.Pending);

    if (statusFilter === 'Current & Upcoming') {
      data = data.filter(
        (b) =>
          b.bookingStatus === BookingStatus.Confirmed ||
          b.bookingStatus === BookingStatus.CheckedIn ||
          b.bookingStatus === BookingStatus.CheckedOut
      );
    } else if (statusFilter !== 'All') {
      data = data.filter((b) => b.bookingStatus === statusFilter);
    }

    if (debouncedSearch) {
      data = data.filter((b) => {
        const name = (b.fullName ?? '').toLowerCase();
        const room = String(b.roomNumbers ?? '').toLowerCase();
        const id = String(b.bookingId ?? '');
        const status = String(b.bookingStatus ?? '').toLowerCase();

        return (
          name.includes(debouncedSearch) ||
          id.includes(debouncedSearch) ||
          room.includes(debouncedSearch) ||
          status.includes(debouncedSearch)
        );
      });
    }

    if (dateRange.start || dateRange.end) {
      const start = dateRange.start ? toStartOfDay(dateRange.start) : null;
      const end = dateRange.end ? toEndOfDay(dateRange.end) : null;

      data = data.filter((b) => {
        if (!b.checkInDate) return false;
        const d = toStartOfDay(b.checkInDate);
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    return data;
  }, [flattenedBookings, statusFilter, debouncedSearch, dateRange]);

  /* ===========================
     Pagination
  =========================== */

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / entriesPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const indexOfLast = safeCurrentPage * entriesPerPage;
  const indexOfFirst = indexOfLast - entriesPerPage;
  const currentEntries = filteredBookings.slice(indexOfFirst, indexOfLast);

  /* ===========================
     UI helpers
  =========================== */

  const getStatusBadge = useCallback((status: BookingStatus) => {
    const map: Record<BookingStatus, { bg: string; text: string; dot: string }> = {
      [BookingStatus.Confirmed]: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
      [BookingStatus.CheckedIn]: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
      [BookingStatus.Pending]: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
      [BookingStatus.CheckedOut]: { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-500' },
      [BookingStatus.Cancelled]: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    };

    const style = map[status] || map[BookingStatus.Confirmed];

    return (
      <span
        className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-full ${style.bg} ${style.text} ring-1 ring-inset ring-black/5`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse`}></span>
        {status}
      </span>
    );
  }, []);

  /* ===========================
     Modal handlers
  =========================== */

 const handleOpenModal = useCallback(
  async (row: FlatBookingRow) => {
    const booking = (bookings ?? []).find((b: any) => getBookingKey(b) === row.bookingId);
    if (!booking) return;

    const bookingDetail: any = booking;

    // ✅ เช็คว่าเช็คอินแล้วไหม
    const checked = isCheckedInOrLater(bookingDetail);

    // ----------------------------
    // 1) guest list เดิม (ก่อนเช็คอิน)
    // ----------------------------
    const rawMergedGuestList =
      bookingDetail?.guest_list ?? 
      bookingDetail?.guestList ?? 
      bookingDetail?.accompanyingGuests ?? 
      bookingDetail?.accompanying_guests ?? 
      bookingDetail?.customer?.guestList ?? 
      bookingDetail?.customer?.guest_list ?? 
      row.guestList ?? 
      bookingDetail?.guests ?? 
      [];

    let mergedGuestList = normalizeGuestList(rawMergedGuestList);

    // ----------------------------
    // 2) ถ้าเช็คอินแล้ว → fetch guests แล้ว "แทน"
    // ----------------------------
    if (checked) {
      try {
        const apiGuests = await guestsService.fetchByBookingId(row.bookingId);
        mergedGuestList = mapGuestsFromApiToGuestList(apiGuests);
      } catch (e) {
        console.warn("[BookingManagement] fetchByBookingId failed, fallback old guestList", e);
        // fallback = ใช้ mergedGuestList เดิม
      }
    }

    const customerObj = bookingDetail?.customer ?? {};

    const customer: Customer = {
      ...customerObj,

      id: customerObj?.id ?? bookingDetail?.customerId ?? row.customerId,

      // ✅ ไม่ไปแก้ Customer.fullName ตามที่คุณต้องการ
      fullName: resolveFullName(customerObj, resolveFullName(bookingDetail, row.fullName)),

      email: customerObj?.email ?? bookingDetail?.email ?? row.email,

      bookingId: bookingDetail?.id ?? row.bookingId,
      bookingStatus: bookingDetail?.status ?? row.bookingStatus,
      paymentStatus: bookingDetail?.paymentStatus ?? "Pending",

      checkInDate: bookingDetail?.checkInDate ?? bookingDetail?.check_in,
      checkOutDate: bookingDetail?.checkOutDate ?? bookingDetail?.check_out,

      roomStays: (bookingDetail?.rooms ?? []).map((r: any) => ({
        roomNumber: r?.room?.roomNumber ?? r?.room?.roomCode ?? "—",
        bookingStatus: bookingDetail?.status ?? row.bookingStatus,
      })),

      // ⭐ ตรงนี้แหละ: ถ้าเช็คอินแล้วจะเป็นรายชื่อจาก guests table
      // ถ้ายังไม่เช็คอินจะเป็นของเดิม
      guestList: mergedGuestList,
    };

    setCustomerForModal(customer);
    setIsModalOpen(true);
  },
  [bookings]
);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setCustomerForModal(null);
  }, []);

  /* ===========================
     Delete
  =========================== */

  const handleConfirmDelete = useCallback(async () => {
    if (!canDelete) return;
    if (!bookingToDelete || isDeleting) return;

    setIsDeleting(true);
    setToast(null);

    try {
      await bookingsService.remove(bookingToDelete.bookingId);

      await refreshBookings();

      setBookings((prev) => (prev ?? []).filter((b: any) => getBookingKey(b) !== bookingToDelete.bookingId));

      setToast({ message: `ลบ Booking #${bookingToDelete.bookingId} สำเร็จ`, type: 'success' });
      setBookingToDelete(null);
    } catch (err: any) {
      const msg = err?.message ?? 'ลบไม่สำเร็จ';
      setToast({ message: `ลบไม่สำเร็จ: ${msg}`, type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  }, [bookingToDelete, isDeleting, refreshBookings, setBookings, canDelete]);

  /* ===========================
     Columns
  =========================== */

  const columns = useMemo(
    () => [
      {
        header: 'BOOKING ID',
        accessor: (row: FlatBookingRow) => <span className="font-bold text-gray-900">#{row.bookingId}</span>,
      },
      {
        header: 'GUEST NAME',
        accessor: (row: FlatBookingRow) => <span className="font-medium text-gray-900">{row.fullName ?? '—'}</span>,
      },
      {
        header: 'ROOM',
        accessor: (row: FlatBookingRow) => (
          <button
            onClick={() => handleOpenModal(row)}
            className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
            {row.roomNumbers ?? 'N/A'}
          </button>
        ),
      },
      {
        header: 'CHECK-IN',
        accessor: (row: FlatBookingRow) => <span className="text-gray-700">{row.checkInDate ?? '—'}</span>,
      },
      {
        header: 'CHECK-OUT',
        accessor: (row: FlatBookingRow) => <span className="text-gray-700">{row.checkOutDate ?? '—'}</span>,
      },
      {
        header: 'GUESTS',
        accessor: (row: FlatBookingRow) => (
          <div className="flex items-center gap-2">
            <Users size={16} className="text-gray-400" />
            <span className="font-medium text-gray-900">{(row.adults ?? 0) + (row.children ?? 0)}</span>
          </div>
        ),
      },
      {
        header: 'STATUS',
        accessor: (row: FlatBookingRow) => getStatusBadge(row.bookingStatus),
      },
    ],
    [handleOpenModal, getStatusBadge]
  );

  /* ===========================
     Stats Cards
  =========================== */

  const stats = useMemo(() => {
    const dataNoPending = flattenedBookings.filter((b) => b.bookingStatus !== BookingStatus.Pending);

    const total = dataNoPending.length;
    const confirmed = dataNoPending.filter((b) => b.bookingStatus === BookingStatus.Confirmed).length;
    const checkedIn = dataNoPending.filter((b) => b.bookingStatus === BookingStatus.CheckedIn).length;

    return { total, confirmed, checkedIn };
  }, [flattenedBookings]);

  /* ===========================
     Render
  =========================== */

  if (denyView) {
    return <AccessDenied message="You do not have permission to view bookings." />;
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-bold text-gray-900 mb-2">Booking Management</h1>
            <p className="text-gray-600">Manage all your hotel bookings in one place</p>
          </div>
          <Button
            leftIcon={<PlusCircle size={20} />}
            onClick={() => navigate('/bookings/create')}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
            disabled={!canCreate}
          >
            Create Booking
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total Bookings</p>
                <p className="font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Calendar size={24} className="text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Confirmed</p>
                <p className="font-bold text-gray-900">{stats.confirmed}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Checked-In</p>
                <p className="font-bold text-gray-900">{stats.checkedIn}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-3xl shadow-xl border-2 border-gray-200 overflow-hidden">
        {/* Filters Section */}
        <div className="bg-gradient-to-r from-white to-gray-50/50 p-6 border-b-2 border-gray-200">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search guest name, booking ID, room number..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           transition-all placeholder:text-gray-400"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-gray-700">
                <Filter size={18} />
                <label className="font-semibold text-sm">Status:</label>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="px-4 py-3 border-2 border-gray-200 rounded-xl bg-white font-medium text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         transition-all cursor-pointer hover:border-gray-300"
              >
                <option value="All">All Bookings</option>
                <option value="Current & Upcoming">Current & Upcoming</option>
                <option value={BookingStatus.Confirmed}>Confirmed</option>
                <option value={BookingStatus.CheckedIn}>Checked-In</option>
                <option value={BookingStatus.CheckedOut}>Checked-Out</option>
                <option value={BookingStatus.Cancelled}>Cancelled</option>
              </select>
            </div>
          </div>

          {/* Active Filters Summary */}
          {(searchTerm || statusFilter !== 'All') && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-600">Active filters:</span>
              {searchTerm && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="hover:text-blue-900">
                    <X size={14} />
                  </button>
                </span>
              )}
              {statusFilter !== 'All' && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter('All')} className="hover:text-blue-900">
                    <X size={14} />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            Showing <span className="font-bold text-gray-900">{filteredBookings.length ? indexOfFirst + 1 : 0}</span> to{' '}
            <span className="font-bold text-gray-900">{Math.min(indexOfLast, filteredBookings.length)}</span> of{' '}
            <span className="font-bold text-gray-900">{filteredBookings.length}</span> bookings
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table
            columns={columns}
            data={currentEntries}
            renderRowActions={(row: FlatBookingRow) => (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => handleOpenModal(row)}
                  className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-all hover:scale-110 active:scale-95"
                  title="View Details"
                >
                  <Eye size={18} />
                </button>

                <button
                  onClick={() => setBookingToDelete(row)}
                  className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-all hover:scale-110 active:scale-95"
                  title="Delete Booking"
                  disabled={!canDelete}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}
          />
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-5 bg-gray-50 border-t-2 border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Rows per page:</label>
                <select
                  value={entriesPerPage}
                  onChange={(e) => {
                    setEntriesPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border-2 border-gray-200 rounded-lg bg-white text-sm font-medium
                           focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="px-4 py-2 rounded-lg border-2 border-gray-200 font-medium text-sm
                           disabled:opacity-50 disabled:cursor-not-allowed
                           hover:bg-gray-100 transition-all enabled:hover:scale-105 active:scale-95"
                >
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={[ 
                        'px-4 py-2 rounded-lg font-bold text-sm transition-all',
                        page === safeCurrentPage
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                          : 'border-2 border-gray-200 hover:bg-gray-100 text-gray-700',
                      ].join(' ')}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="px-4 py-2 rounded-lg border-2 border-gray-200 font-medium text-sm
                           disabled:opacity-50 disabled:cursor-not-allowed
                           hover:bg-gray-100 transition-all enabled:hover:scale-105 active:scale-95"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      <BookingDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        customer={customerForModal}
        mode="view"
        onUpdateCustomer={(updatedCustomer) => {
          setBookings((prev) =>
            (prev ?? []).map((b: any) =>
              b?.customer?.id === updatedCustomer.id ? { ...b, customer: updatedCustomer } : b
            )
          );
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!bookingToDelete}
        title="Delete booking?"
        message={`Are you sure you want to delete booking #${bookingToDelete?.bookingId}? This action cannot be undone.`}
        confirmText={isDeleting ? 'Deleting...' : 'Confirm'}
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => (isDeleting ? null : setBookingToDelete(null))}
      />
    </div>
  );
};

export default BookingManagement;
