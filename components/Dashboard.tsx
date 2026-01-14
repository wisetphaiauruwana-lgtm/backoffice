// src/components/Dashboard.tsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useBookings } from "../contexts/BookingsContext";
import { useData } from "../contexts/DataContext";
import Table from "./ui/Table";
import Modal from "./ui/Modal";
import { guestsService } from "../services/guests.service";
import { roomsService } from "../services/rooms.service";

import { Customer, Guest, BookingStatus } from "../types";
import {
  Hotel,
  BedDouble,
  LogIn,
  LogOut,
  Eye,
  Pencil,
  X,
  FileWarning,
  Calendar,
} from "lucide-react";

/* ---------------- Types ---------------- */

type RoomStayLite = {
  roomNumber: string;
  bookingStatus: BookingStatus;
};

type CustomerWithBooking = Customer & {
  bookingId?: number | string;
  bookingStatus: BookingStatus;
  roomStays?: RoomStayLite[];
  guestList?: Guest[];
  checkInDate?: string;
  checkOutDate?: string;
  fullName?: string;
};

type BookingGroupRow = {
  id: string;
  bookingId: string;
  originalBooking: CustomerWithBooking;
  roomNumbers: string; // "101, 102"
  bookingStatus: BookingStatus;
};

/* ---------------- Helpers ---------------- */

// Local date YYYY-MM-DD (แก้ UTC ทำให้วันเพี้ยน)
const getLocalDateISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// คืนค่า YYYY-MM-DD จาก input ที่อาจเป็น YYYY-MM-DD หรือ ISO
const dateOnly = (value?: string) => {
  if (!value) return undefined;

  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const toLocalDateMs = (value?: string) => {
  const d = dateOnly(value);
  if (!d) return NaN;
  const [y, m, day] = d.split("-").map(Number);
  const dt = new Date(y, m - 1, day);
  return dt.getTime();
};

const normalizeGuestName = (g: any, fallback: string) => {
  const name =
    g?.fullName ??
    g?.full_name ??
    g?.name ??
    g?.guestName ??
    g?.guest_name ??
    [g?.firstName ?? g?.first_name, g?.lastName ?? g?.last_name].filter(Boolean).join(" ");
  return String(name || "").trim() || fallback;
};

/* ---------------- Status ---------------- */

const normalizeStatus = (status: unknown): BookingStatus => {
  const s = String(status ?? "")
    .toLowerCase()
    .replace(/[\s-_]/g, "");

  if (s === "checkedin") return BookingStatus.CheckedIn;
  if (s === "checkedout") return BookingStatus.CheckedOut;
  if (s === "confirmed") return BookingStatus.Confirmed;
  if (s === "pending") return BookingStatus.Pending;
  if (s === "cancelled" || s === "canceled") return BookingStatus.Cancelled;

  // @ts-expect-error runtime guard
  if (Object.values(BookingStatus).includes(status)) return status as BookingStatus;

  return BookingStatus.Pending;
};

const getStatusBadge = (status: BookingStatus) => {
  const normalized = String(status).toLowerCase().replace(/[\s-_]/g, "");
  const map: Record<string, string> = {
    confirmed: "bg-blue-100 text-blue-700",
    checkedin: "bg-green-100 text-green-700",
    checkedout: "bg-gray-200 text-gray-700",
    pending: "bg-yellow-100 text-yellow-700",
    cancelled: "bg-red-100 text-red-700",
    canceled: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
        map[normalized] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {String(status)}
    </span>
  );
};

/* ---------------- Group helper ---------------- */
/**
 * รวมให้เหลือ 1 แถว ต่อ 1 booking
 * - key = bookingId
 * - rooms รวมเป็น "101, 102"
 */
const groupByBooking = (
  customers: CustomerWithBooking[],
  predicate: (c: CustomerWithBooking) => boolean
): BookingGroupRow[] => {
  const map = new Map<string, BookingGroupRow>();

  for (const c of customers) {
    if (!predicate(c)) continue;

    const bookingIdRaw = (c as any).bookingId ?? c.id ?? "";
    const bookingId = String(bookingIdRaw).trim();
    if (!bookingId) continue;

    const rooms = (c.roomStays ?? [])
      .map((rs) => String(rs?.roomNumber ?? "").trim())
      .filter((x) => x && x !== "—");

    const existing = map.get(bookingId);

    if (!existing) {
      map.set(bookingId, {
        id: `booking-${bookingId}`,
        bookingId,
        originalBooking: c,
        roomNumbers: rooms.length ? Array.from(new Set(rooms)).join(", ") : "—",
        bookingStatus: c.bookingStatus ?? BookingStatus.Pending,
      });
    } else {
      const prevRooms =
        existing.roomNumbers && existing.roomNumbers !== "—"
          ? existing.roomNumbers
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

      const merged = Array.from(new Set([...prevRooms, ...rooms])).filter(Boolean);

      map.set(bookingId, {
        ...existing,
        roomNumbers: merged.length ? merged.join(", ") : "—",
        bookingStatus: c.bookingStatus ?? existing.bookingStatus,
      });
    }
  }

  return Array.from(map.values());
};

/* ---------------- Component ---------------- */

const Dashboard: React.FC = () => {
  const { bookings } = useBookings();
  const { rooms = [], setRooms } = useData();
  const navigate = useNavigate();
  const today = useMemo(() => getLocalDateISO(), []);
  const [guests, setGuests] = useState<Guest[]>([]);
  const didLoadRoomsRef = useRef(false);

  useEffect(() => {
    let isActive = true;
    guestsService
      .fetchAll()
      .then((data) => {
        if (isActive) setGuests(data ?? []);
      })
      .catch((err) => {
        console.error("[Dashboard] fetch guests failed", err);
      });
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (didLoadRoomsRef.current) return;
    didLoadRoomsRef.current = true;

    if (rooms.length > 0) return;

    let isActive = true;
    roomsService
      .fetchAll()
      .then((data) => {
        if (isActive) setRooms(data ?? []);
      })
      .catch((err) => {
        console.error("[Dashboard] fetch rooms failed", err);
      });
    return () => {
      isActive = false;
    };
  }, [rooms.length, setRooms]);

  // ✅ Booking Details Modal state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingModalMode, setBookingModalMode] = useState<"view" | "edit">("view");
  const [activeBookingRow, setActiveBookingRow] = useState<BookingGroupRow | null>(null);

  const openBookingModal = (row: BookingGroupRow, mode: "view" | "edit") => {
    setActiveBookingRow(row);
    setBookingModalMode(mode);
    setIsBookingModalOpen(true);
  };

  const closeBookingModal = () => {
    setIsBookingModalOpen(false);
    setActiveBookingRow(null);
    setBookingModalMode("view");
  };

  /* ---------------- Normalize Bookings -> CustomersWithBooking ---------------- */
  const customers: CustomerWithBooking[] = useMemo(() => {
    return (bookings ?? []).map((b: any) => {
      const bookingId = b?.id ?? b?.ID ?? b?.bookingId ?? b?.booking_id ?? "";
      const bookingStatus = normalizeStatus(b?.status);

      const roomStays: RoomStayLite[] = (b.rooms ?? []).map((r: any) => ({
        roomNumber: String(r?.room?.roomNumber ?? r?.room?.roomCode ?? "—"),
        bookingStatus,
      }));

      return {
        ...(b.customer ?? {}),
        id: bookingId || b.customer?.id || b.id,
        bookingId,
        fullName: b.customer?.fullName ?? "—",
        checkInDate: b.checkInDate ?? b.check_in,
        checkOutDate: b.checkOutDate ?? b.check_out,
        bookingStatus,
        guestList: b.guests ?? b.customer?.guestList ?? [],
        roomStays,
      } as CustomerWithBooking;
    });
  }, [bookings]);

  const bookingGroupMap = useMemo(() => {
    const rows = groupByBooking(customers, () => true);
    return new Map(rows.map((r) => [String(r.bookingId), r]));
  }, [customers]);

  const guestsByBookingId = useMemo(() => {
    const map = new Map<string, Guest[]>();
    (guests ?? []).forEach((g: any) => {
      const bookingId = String(g?.bookingId ?? g?.booking_id ?? "").trim();
      if (!bookingId) return;
      const list = map.get(bookingId) ?? [];
      list.push(g);
      map.set(bookingId, list);
    });
    return map;
  }, [guests]);

  /* ---------------- Validation ---------------- */
  const isPersonComplete = (p: Customer | Guest) =>
    ["passportId", "occupation", "currentAddress"].every((f) => {
      const v = (p as any)[f];
      return v && String(v).trim() !== "";
    });

  /* ---------------- Grouped rows ---------------- */
  const checkedInRows: BookingGroupRow[] = useMemo(() => {
    return groupByBooking(customers, (c) =>
      (c.roomStays ?? []).some((rs) => rs.bookingStatus === BookingStatus.CheckedIn)
    );
  }, [customers]);

  const todaysCheckOutRows: BookingGroupRow[] = useMemo(() => {
    const rows: BookingGroupRow[] = [];
    const seen = new Set<string>();

    (guests ?? []).forEach((g: any) => {
      const bookingId = String(g?.bookingId ?? g?.booking_id ?? "").trim();
      if (!bookingId || seen.has(bookingId)) return;

      const row = bookingGroupMap.get(bookingId);
      if (!row) return;

      if (dateOnly(row.originalBooking.checkOutDate) !== today) return;

      seen.add(bookingId);
      rows.push(row);
    });

    return rows;
  }, [bookingGroupMap, guests, today]);

  const todaysCheckInRows: BookingGroupRow[] = useMemo(() => {
    return groupByBooking(customers, (c) => dateOnly(c.checkInDate) === today);
  }, [customers, today]);

  /* ---------------- KPI ---------------- */
  const stats = useMemo(() => {
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter((r: any) => r.status === "Available").length;

    const todaysCheckIns = todaysCheckInRows.length;
    const todaysCheckOuts = todaysCheckOutRows.length;

    return {
      totalRooms,
      availableRooms,
      todaysCheckIns,
      todaysCheckOuts,
    };
  }, [rooms, today, todaysCheckOutRows, todaysCheckInRows]);

  /* ---------------- Missing Registration ---------------- */
  const missingRegCount = useMemo(() => {
    let count = 0;
    customers.forEach((c) => {
      if (!isPersonComplete(c)) count++;
      (c.guestList ?? []).forEach((g: any) => {
        if (!isPersonComplete(g)) count++;
      });
    });
    return count;
  }, [customers]);

  /* ---------------- Recent Check-Ins (top 5) ---------------- */
  const recentCheckIns: BookingGroupRow[] = useMemo(() => {
    const rows: BookingGroupRow[] = [];
    const seen = new Set<string>();

    (guests ?? []).forEach((g: any) => {
      const bookingId = String(g?.bookingId ?? g?.booking_id ?? "").trim();
      if (!bookingId || seen.has(bookingId)) return;

      if (typeof g?.isMainGuest === "boolean" && !g.isMainGuest) return;

      const row = bookingGroupMap.get(bookingId);
      if (!row) return;

      if (row.bookingStatus !== BookingStatus.CheckedIn) return;

      seen.add(bookingId);
      rows.push(row);
    });

    return rows
      .sort((a, b) => {
        const ad = toLocalDateMs(a.originalBooking.checkInDate);
        const bd = toLocalDateMs(b.originalBooking.checkInDate);
        if (Number.isNaN(ad) && Number.isNaN(bd)) return 0;
        if (Number.isNaN(ad)) return 1;
        if (Number.isNaN(bd)) return -1;
        return bd - ad;
      })
      .slice(0, 5);
  }, [bookingGroupMap, guests]);

  /* ---------------- Table Columns ---------------- */
  const columns = useMemo(
    () => [
      {
        header: "Guest Name",
        accessor: (r: BookingGroupRow) => r.originalBooking.fullName ?? "—",
      },
      {
        header: "Room",
        accessor: (r: BookingGroupRow) => r.roomNumbers,
      },
      {
        header: "Status",
        accessor: (r: BookingGroupRow) => getStatusBadge(r.bookingStatus),
      },
    ],
    []
  );

  // (ยังเก็บไว้เผื่อคุณอยากใช้ที่อื่น)
  const handleViewDetails = (c: CustomerWithBooking) =>
    navigate("/bookings", { state: { openBookingId: String(c.bookingId ?? c.id ?? "") } });

  /* ---------------- Render ---------------- */
  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500">Hotel overview</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border">
          <Calendar size={16} />
          <span className="text-sm">{today}</span>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <Kpi title="Total Rooms" value={stats.totalRooms} icon={<Hotel />} />
        <Kpi title="Available Rooms" value={stats.availableRooms} icon={<BedDouble />} />
        <Kpi title="Today's Check-Ins" value={stats.todaysCheckIns} icon={<LogIn />} />
        <Kpi title="Today's Check-Outs" value={stats.todaysCheckOuts} icon={<LogOut />} />
      </div>

      {/* Alerts */}
      {missingRegCount > 0 && (
        <div className="bg-white border-l-4 border-red-500 p-6 rounded-lg flex gap-4">
          <FileWarning className="text-red-600" />
          <div>
            <h3 className="font-bold text-gray-800">Missing Registration Data</h3>
            <p className="text-sm text-gray-600">{missingRegCount} guests incomplete</p>
          </div>
        </div>
      )}

      {/* TABLES */}
      <div className="flex flex-col gap-8">
        {/* Recent Check-Ins */}
        <Section title="Recent Check-Ins">
          <Table
            columns={columns}
            data={recentCheckIns}
            renderRowActions={(row: BookingGroupRow) => (
              <div className="flex items-center justify-center gap-2">
                {/* View icon only */}
                <button
                  type="button"
                  onClick={() => openBookingModal(row, "view")}
                  title="View"
                  aria-label="View booking details"
                  className="group flex items-center justify-center w-8 h-8
                             text-gray-500 hover:text-blue-600
                             rounded-lg hover:bg-blue-50
                             transition-all duration-200 hover:scale-110"
                >
                  <Eye size={16} className="group-hover:scale-110 transition-transform" />
                </button>

                {/* Edit icon only */}
                <button
                  type="button"
                  onClick={() => openBookingModal(row, "edit")}
                  title="Edit"
                  aria-label="Edit booking"
                  className="group flex items-center justify-center w-8 h-8
                             text-gray-500 hover:text-amber-600
                             rounded-lg hover:bg-amber-50
                             transition-all duration-200 hover:scale-110"
                >
                  <Pencil size={16} className="group-hover:scale-110 transition-transform" />
                </button>
              </div>
            )}
          />
        </Section>

        {/* Today's Check-Outs */}
        <Section title="Today's Check-Outs">
          <Table
            columns={columns}
            data={todaysCheckOutRows}
            renderRowActions={(row: BookingGroupRow) => (
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => openBookingModal(row, "view")}
                  title="View"
                  aria-label="View booking details"
                  className="group flex items-center justify-center w-8 h-8
                             text-gray-500 hover:text-blue-600
                             rounded-lg hover:bg-blue-50
                             transition-all duration-200 hover:scale-110"
                >
                  <Eye size={16} className="group-hover:scale-110 transition-transform" />
                </button>
              </div>
            )}
          />
        </Section>
      </div>

      {/* ✅ Booking Details Modal */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={closeBookingModal}
        maxWidth="3xl"
        title={
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  bookingModalMode === "edit" ? "bg-amber-500" : "bg-blue-600"
                }`}
              />
              <div className="font-semibold">
                Booking Details {activeBookingRow?.bookingId ? `#${activeBookingRow.bookingId}` : ""}
              </div>
              <div className="text-xs text-gray-500">
                {bookingModalMode === "edit" ? "(Edit Mode)" : "(View Mode)"}
              </div>
            </div>

            <button
              type="button"
              onClick={closeBookingModal}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              aria-label="Close"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        }
      >
        {!activeBookingRow ? (
          <div className="p-4 text-gray-500">No booking selected</div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 border rounded-xl p-4">
                <div className="text-xs text-gray-500">Guest</div>
                <div className="text-lg font-semibold text-gray-900">
                  {activeBookingRow.originalBooking.fullName ?? "—"}
                </div>
              </div>

              <div className="bg-gray-50 border rounded-xl p-4">
                <div className="text-xs text-gray-500">Rooms</div>
                <div className="text-lg font-semibold text-gray-900">
                  {activeBookingRow.roomNumbers ?? "—"}
                </div>
              </div>

              <div className="bg-gray-50 border rounded-xl p-4">
                <div className="text-xs text-gray-500">Status</div>
                <div className="text-lg font-semibold text-gray-900">
                  {String(activeBookingRow.bookingStatus ?? "—")}
                </div>
              </div>

              <div className="bg-gray-50 border rounded-xl p-4">
                <div className="text-xs text-gray-500">Check-in / Check-out</div>
                <div className="text-sm font-semibold text-gray-900">
                  {dateOnly(activeBookingRow.originalBooking.checkInDate) ?? "—"}{" "}
                  <span className="text-gray-400">→</span>{" "}
                  {dateOnly(activeBookingRow.originalBooking.checkOutDate) ?? "—"}
                </div>
              </div>
            </div>

            {/* Guest list */}
            <div className="bg-white border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-gray-900">Guest List in this booking</div>
                <div className="text-xs text-gray-500">
                  {(activeBookingRow.originalBooking.guestList ?? []).length} guests
                </div>
              </div>

              <div className="space-y-2">
                {(() => {
                  const bookingId = String(activeBookingRow.bookingId ?? "");
                  const apiGuests = guestsByBookingId.get(bookingId) ?? [];
                  const fallbackGuests = activeBookingRow.originalBooking.guestList ?? [];
                  const list = apiGuests.length > 0 ? apiGuests : fallbackGuests;

                  if (list.length === 0) {
                    return <div className="text-sm text-gray-500">—</div>;
                  }

                  return list.map((g: any, idx: number) => (
                    <div
                      key={`${bookingId}-${idx}`}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50"
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {normalizeGuestName(g, `Guest ${idx + 1}`)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {g?.nationality ?? "—"} • {g?.idNumber ?? g?.documentNumber ?? "—"}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeBookingModal}
                className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 text-gray-700 font-medium"
              >
                Close
              </button>

              {bookingModalMode === "edit" && (
                <button
                  type="button"
                  onClick={() => alert("ถ้าจะ Save booking ต้องต่อ endpoint update booking ก่อน")}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                >
                  Save
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

/* ---------------- Small Components ---------------- */

type KpiProps = {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
};

const Kpi: React.FC<KpiProps> = ({ title, value, icon }) => (
  <div className="bg-white p-6 rounded-xl border shadow-sm">
    <div className="flex justify-between items-center mb-2">
      <div className="text-gray-500 text-sm">{title}</div>
      {icon}
    </div>
    <div className="text-3xl font-bold text-gray-800">{value}</div>
  </div>
);

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <div className="bg-white p-6 rounded-xl border shadow-sm">
    <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
    {children}
  </div>
);

export default Dashboard;
