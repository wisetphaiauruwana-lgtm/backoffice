import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Input from "./ui/Input";
import Select from "./ui/Select";
import Button from "./ui/Button";
import { useData } from "../contexts/DataContext";
import { Room, RoomStatus, GuestType, Customer, Gender } from "../types";
import {
  ArrowLeft,
  Trash2,
  Loader2,
  AlertCircle,
  Users,
  CalendarDays,
  BedDouble,
  CheckCircle2,
  Sparkles,
  Clock,
} from "lucide-react";
import Toast from "./ui/Toast";
import { roomsService } from "../services/rooms.service";
import { customersService } from "../services/customers.service";
import { bookingsService } from "../services/bookings.service";
import { usePermissions } from "../hooks/usePermissions";
import AccessDenied from "./ui/AccessDenied";

const CreateBooking: React.FC = () => {
  const navigate = useNavigate();
  const { rooms, setRooms } = useData();
  const { can } = usePermissions();
  const canCreate = can("bookingManagement", "create");
  const denyCreate = !canCreate;

  // -----------------------
  // State
  // -----------------------
  const [bookingType, setBookingType] = useState<"Overnight" | "Hourly">("Overnight");
  const [bookingDetails, setBookingDetails] = useState({
    checkInDate: "",
    checkOutDate: "",
    date: "",
    checkInTime: "",
    checkOutTime: "",
    adults: 1,
    children: 0,
  });

  const [selectedRooms, setSelectedRooms] = useState<Room[]>([]);

  const [mainBooker, setMainBooker] = useState({
    name: "",
    email: "",
    gender: "Male" as Gender,
    nationality: "TH",
  });

  const [accompanyingGuests, setAccompanyingGuests] = useState<{
    id: number;
    name: string;
    guestType: GuestType;
  }[]>([]);

  const showRooms = true;

  const [sendEmail, setSendEmail] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  const [floorFilter, setFloorFilter] = useState("All Floors");
  const [roomTypeFilter, setRoomTypeFilter] = useState("All Types");

  const controllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, []);

  const todayLocal = useCallback(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const fetchRoomsFromServer = useCallback(async () => {
    if (!setRooms) {
      console.warn("fetchRoomsFromServer: setRooms missing from context");
      return;
    }

    setIsLoadingRooms(true);
    try {
      const fetched = await roomsService.fetchAll();

      if (Array.isArray(fetched)) {
        const normalized = fetched.map((r) => {
          const anyR = r as any;
          return {
            ...anyR,
            roomCode:
              (anyR.roomCode ??
                anyR.room_code ??
                anyR.roomNumber ??
                anyR.room_number ??
                anyR.roomNo ??
                "").toString(),
            status: anyR.status ?? anyR.roomStatus ?? anyR.state ?? RoomStatus.Available,
            floor: anyR.floor ?? anyR.floorName ?? "Unknown",
            type: anyR.type ?? anyR.roomType ?? "Standard",
            ID: anyR.ID ?? anyR.id ?? anyR.roomId ?? anyR.numericId,
          } as Room;
        });

        if (isMountedRef.current) {
          setRooms(normalized);
          console.debug("fetchRoomsFromServer: rooms saved (length)", normalized.length);
        }
      } else {
        console.warn("fetchRoomsFromServer: unexpected response", fetched);
        setToast({ message: "Unexpected rooms payload from server", type: "error" });
      }
    } catch (err: any) {
      console.error("fetchRoomsFromServer error", err);
      setToast({ message: `Failed to fetch rooms: ${err?.message || err}`, type: "error" });
    } finally {
      if (isMountedRef.current) setIsLoadingRooms(false);
    }
  }, [setRooms]);

  useEffect(() => {
    fetchRoomsFromServer();
  }, []);


  const handleBookingDetailChange = useCallback((field: keyof typeof bookingDetails, value: any) => {
    setBookingDetails((prev) => {
      const newDetails = { ...prev, [field]: value };
      if (field === "checkInDate") newDetails.checkOutDate = "";
      if (field === "checkInTime") newDetails.checkOutTime = "";
      return newDetails;
    });

    setSelectedRooms([]);
  }, []);

  const handleBookingTypeChange = useCallback((type: "Overnight" | "Hourly") => {
    setBookingType(type);
    setSelectedRooms([]);
    setBookingDetails({
      checkInDate: "",
      checkOutDate: "",
      date: "",
      checkInTime: "",
      checkOutTime: "",
      adults: 1,
      children: 0,
    } as any);
  }, []);

  const availableRooms = useMemo(() => {
    return (rooms ?? []).filter((room) => {
      const status = (room as any).status ?? RoomStatus.Available;
      return String(status).toLowerCase() === String(RoomStatus.Available).toLowerCase();
    });
  }, [rooms]);

  const floorOptions = useMemo(
    () =>
      ["All Floors", ...Array.from(new Set(availableRooms.map((r) => r.floor))).sort((a: string, b: string) => {
        const na = parseInt((a || "").replace(/[^\d-]/g, "")) || 0;
        const nb = parseInt((b || "").replace(/[^\d-]/g, "")) || 0;
        return na - nb;
      })],
    [availableRooms]
  );

  const roomTypeOptions = useMemo(
    () => ["All Types", ...Array.from(new Set(availableRooms.map((r) => r.type)))],
    [availableRooms]
  );

  const filteredDisplayRooms = useMemo(() => {
    return availableRooms
      .filter((room) => floorFilter === "All Floors" || room.floor === floorFilter)
      .filter((room) => roomTypeFilter === "All Types" || room.type === roomTypeFilter);
  }, [availableRooms, floorFilter, roomTypeFilter]);

  const parseLocalDate = useCallback((s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }, []);

  const stayDuration = useMemo(() => {
    if (bookingType !== "Overnight" || !bookingDetails.checkInDate || !bookingDetails.checkOutDate) return 0;
    const start = parseLocalDate(bookingDetails.checkInDate);
    const end = parseLocalDate(bookingDetails.checkOutDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start.getTime() >= end.getTime()) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [bookingType, bookingDetails.checkInDate, bookingDetails.checkOutDate, parseLocalDate]);

  const stayDurationHours = useMemo(() => {
    if (
      bookingType !== "Hourly" ||
      !bookingDetails.checkInTime ||
      !bookingDetails.checkOutTime ||
      !bookingDetails.date
    )
      return 0;

    const parseLocal = (dateStr: string, timeStr: string) => {
      const [y, m, d] = dateStr.split("-").map(Number);
      const [hh, mm] = timeStr.split(":").map(Number);
      return new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
    };

    const startMs = parseLocal(bookingDetails.date, bookingDetails.checkInTime);
    let endMs = parseLocal(bookingDetails.date, bookingDetails.checkOutTime);

    if (endMs <= startMs) endMs += 24 * 60 * 60 * 1000; // ข้ามวัน
    return (endMs - startMs) / (1000 * 60 * 60);
  }, [bookingType, bookingDetails.checkInTime, bookingDetails.checkOutTime, bookingDetails.date]);

  const hourlyTimeOptions = useMemo(
    () => Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0") + ":00"),
    []
  );

  const checkOutTimeOptions = useMemo(() => {
    if (!bookingDetails.checkInTime) return [];
    const inT = bookingDetails.checkInTime;

    return hourlyTimeOptions
      .filter((t) => t !== inT)
      .map((t) => ({
        value: t,
        label: t <= inT ? `${t} (next day)` : t,
      }));
  }, [bookingDetails.checkInTime, hourlyTimeOptions]);

  const areGuestsValid = useMemo(() => {
    const isMainBookerNamed = mainBooker.name.trim() !== "";
    const allAccompanyingGuestsNamed = accompanyingGuests.every((g) => g.name.trim() !== "");
    return isMainBookerNamed && allAccompanyingGuestsNamed;
  }, [accompanyingGuests, mainBooker.name]);

  const isSubmitDisabled = selectedRooms.length === 0 || !areGuestsValid || isLoading;

  const formattedStayDuration = useMemo(() => {
    if (bookingType === "Overnight") {
      if (!bookingDetails.checkInDate || !bookingDetails.checkOutDate) return "N/A";
      return `From: ${bookingDetails.checkInDate}, To: ${bookingDetails.checkOutDate}`;
    }

    if (!bookingDetails.date || !bookingDetails.checkInTime || !bookingDetails.checkOutTime) return "N/A";

    const nextDay = bookingDetails.checkOutTime <= bookingDetails.checkInTime;
    return `From: ${bookingDetails.date} ${bookingDetails.checkInTime}, To: ${nextDay ? "(next day) " : ""
      }${bookingDetails.date} ${bookingDetails.checkOutTime}`;
  }, [
    bookingType,
    bookingDetails.checkInDate,
    bookingDetails.checkOutDate,
    bookingDetails.date,
    bookingDetails.checkInTime,
    bookingDetails.checkOutTime,
  ]);

  const handleAddGuest = useCallback(() => {
    setAccompanyingGuests((prev) => [
      ...prev,
      { id: Date.now(), name: "", guestType: "Adult" }, // ใช้ ID แบบสุ่ม
    ]);
  }, []);

  const handleGuestChange = useCallback((id: number, field: "name" | "guestType", value: string) => {
    setAccompanyingGuests((prev) =>
      prev.map((guest) => (guest.id === id ? { ...guest, [field]: value as GuestType } : guest))
    );
  }, []);

  const handleRemoveGuest = useCallback((id: number) => {
    setAccompanyingGuests((prev) => prev.filter((guest) => guest.id !== id));
  }, []);

  const SummaryRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex justify-between items-start py-2 border-b border-gray-100 last:border-0">
      <dt className="text-sm text-gray-600 font-medium">{label}</dt>
      <dd className="text-sm font-semibold text-gray-900 text-right">{value}</dd>
    </div>
  );

  const resolveRoomNumericId = useCallback(
    async (room: Room | null): Promise<number | undefined> => {
      if (!room) return undefined;
      const fields = ["id", "ID", "roomId", "room_id", "roomID", "numericId"];
      for (const f of fields) {
        const val = (room as any)[f];
        const n = Number(val);
        if (!Number.isNaN(n) && n > 0) return n;
      }
      const match = rooms?.find(
        (r) => String(r.roomCode).trim().toLowerCase() === String(room.roomCode).trim().toLowerCase()
      );
      if (match) {
        const cand = (match as any).id ?? (match as any).ID ?? (match as any).roomId;
        const n = Number(cand);
        if (!Number.isNaN(n) && n > 0) return n;
      }
      console.warn("resolveRoomNumericId failed for", room);
      return undefined;
    },
    [rooms]
  );

  const handleSubmitBooking = useCallback(async () => {
    if (isSubmitDisabled || selectedRooms.length === 0 || !mainBooker.name) return;
    setIsLoading(true);
    setToast(null);
    controllerRef.current = new AbortController();

    const asDateOnly = (isoOrDate: string) => {
      if (!isoOrDate) return "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)) return isoOrDate;
      const m = isoOrDate.match(/^(\d{4}-\d{2}-\d{2})/);
      return m ? m[1] : isoOrDate.split("T")[0];
    };

    const asLocalDateTimeNoZ = (dateStr?: string, timeStr?: string) => {
      if (!dateStr) return "";
      if (timeStr) return `${dateStr}T${timeStr}:00`;
      return `${dateStr}T00:00:00`;
    };

    const addDays = (dateStr: string, days: number) => {
      const [y, m, d] = dateStr.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() + days);
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const dd = String(dt.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };

    try {
      const checkInForPayload =
        bookingType === "Overnight"
          ? asDateOnly(bookingDetails.checkInDate)
          : asLocalDateTimeNoZ(bookingDetails.date, bookingDetails.checkInTime);

      const checkOutForPayload =
        bookingType === "Overnight"
          ? asDateOnly(bookingDetails.checkOutDate)
          : (() => {
            const baseDate = bookingDetails.date;
            const inT = bookingDetails.checkInTime;
            const outT = bookingDetails.checkOutTime;

            const outDate = outT && inT && outT <= inT ? addDays(baseDate, 1) : baseDate;
            return asLocalDateTimeNoZ(outDate, outT);
          })();

      const customerPayload: Partial<Customer> = {
        fullName: mainBooker.name,
        email: mainBooker.email && mainBooker.email.trim() !== "" ? mainBooker.email.trim() : undefined, // อีเมลที่ต้องการ
        gender: mainBooker.gender,
        nationality: mainBooker.nationality,
        adults: bookingDetails.adults,
        children: bookingDetails.children,
      };

      const createdCustomer = await customersService.create(customerPayload as any);

      const customerId =
        (createdCustomer as any)?.id ?? (createdCustomer as any)?.ID ?? (createdCustomer as any)?.customerId ?? (createdCustomer as any)?.CustomerID;

      const resolvedRoomIds = await Promise.all(selectedRooms.map((r) => resolveRoomNumericId(r)));

      const invalid = resolvedRoomIds
        .map((id, idx) => ({ id, idx, roomCode: selectedRooms[idx]?.roomCode }))
        .filter((x) => typeof x.id !== "number" || Number.isNaN(x.id) || x.id <= 0);

      if (invalid.length > 0) {
        setToast({
          message: `ไม่สามารถหาหมายเลขห้องที่ถูกต้องสำหรับ: ${invalid.map((i) => i.roomCode).join(", ")}`,
          type: "error",
        });
        setIsLoading(false);
        return;
      }

      const roomsPayload = (resolvedRoomIds as number[]).map((rid) => ({ room_id: rid }));

      const bookingPayload: Record<string, any> = {
        customer_id: customerId,
        check_in: checkInForPayload,
        check_out: checkOutForPayload,
        adults: bookingDetails.adults,
        children: bookingDetails.children,
        guest_list: accompanyingGuests.map((g) => ({ name: g.name, type: g.guestType })),
        rooms: roomsPayload,
      };

      if (sendEmail && mainBooker.email?.trim()) bookingPayload.send_email = true;

      const created = await bookingsService.create(bookingPayload);

      navigate("/bookings", { state: { refresh: true } });

      await fetchRoomsFromServer();

      const bookingId =
        (created as any)?.data?.id ?? (created as any)?.data?.ID ?? (created as any)?.id ?? (created as any)?.ID;

      if (bookingId) {
        setToast({ type: "success", message: `Booking #${bookingId} created successfully for ${mainBooker.name}` });
      }
    } catch (error: any) {
      console.error("Submission Error:", error);
      let message = error?.message || "Server error";
      if (error?.body) {
        try {
          message = typeof error.body === "string" ? error.body : JSON.stringify(error.body);
        } catch {
          message = String(error.body);
        }
      }
      if (isMountedRef.current) setToast({ message: `Submission failed: ${message}`, type: "error" });
    } finally {
      if (isMountedRef.current) setIsLoading(false);
      controllerRef.current = null;
    }
  }, [
    isSubmitDisabled,
    selectedRooms,
    mainBooker,
    bookingDetails,
    bookingType,
    resolveRoomNumericId,
    accompanyingGuests,
    setRooms,
    navigate,
    sendEmail,
    fetchRoomsFromServer,
  ]);

  const toggleRoomSelection = useCallback((room: Room) => {
    setSelectedRooms((prev) => {
      const isSelected = prev.some((r) => r.roomCode === room.roomCode);
      if (isSelected) return prev.filter((r) => r.roomCode !== room.roomCode);
      return [...prev, room];
    });
  }, []);

  if (denyCreate) {
    return <AccessDenied message="You do not have permission to create bookings." />;
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="max-w-[1800px] mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/bookings")}
            className="group flex items-center justify-center w-10 h-10 rounded-xl bg-white shadow-sm hover:shadow-md text-gray-600 hover:text-blue-600 transition-all duration-200 hover:scale-105"
            aria-label="Back to bookings"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Create New Booking
            </h1>
            <p className="text-sm text-gray-500 mt-1">Fill in the details to create a new reservation</p>
          </div>
        </div>
        <div className="relative flex flex-col lg:flex-row gap-6 lg:items-start">
          <div className="flex-1 space-y-6 lg:pb-0 pb-56">
            {/* Section 1: Booking Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm">
                    <CalendarDays size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Booking Details</h2>
                    <p className="text-xs text-blue-100">Select your booking type and dates</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex justify-start">
                  <div
                    className="inline-flex rounded-xl shadow-sm border border-gray-200 p-1 bg-gray-50"
                    role="tablist"
                    aria-label="Booking type"
                  >
                    <button
                      type="button"
                      onClick={() => handleBookingTypeChange("Overnight")}
                      className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 ${bookingType === "Overnight"
                          ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md scale-105"
                          : "bg-transparent text-gray-700 hover:bg-white/50"
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <BedDouble size={16} />
                        Overnight
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBookingTypeChange("Hourly")}
                      className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:z-10 ${bookingType === "Hourly"
                          ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md scale-105"
                          : "bg-transparent text-gray-700 hover:bg-white/50"
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock size={16} />
                        Hourly
                      </div>
                    </button>
                  </div>
                </div>

                {bookingType === "Overnight" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      id="checkin-date"
                      label="Check-In Date"
                      type="date"
                      value={bookingDetails.checkInDate}
                      onChange={(e) => handleBookingDetailChange("checkInDate", e.target.value)}
                      min={todayLocal()}
                    />
                    <Input
                      id="checkout-date"
                      label="Check-Out Date"
                      type="date"
                      value={bookingDetails.checkOutDate}
                      onChange={(e) => handleBookingDetailChange("checkOutDate", e.target.value)}
                      min={bookingDetails.checkInDate || todayLocal()}
                      disabled={!bookingDetails.checkInDate}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Input
                      id="date"
                      label="Date"
                      type="date"
                      value={bookingDetails.date}
                      onChange={(e) => handleBookingDetailChange("date", e.target.value)}
                      min={todayLocal()}
                    />
                    <Select
                      id="checkin-time"
                      label="Check-In Time"
                      value={bookingDetails.checkInTime}
                      onChange={(e) => handleBookingDetailChange("checkInTime", e.target.value)}
                    >
                      <option value="" disabled>
                        Select time
                      </option>
                      {hourlyTimeOptions.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </Select>
                    <Select
                      id="checkout-time"
                      label="Check-Out Time"
                      value={bookingDetails.checkOutTime}
                      onChange={(e) => handleBookingDetailChange("checkOutTime", e.target.value)}
                      disabled={!bookingDetails.checkInTime}
                    >
                      <option value="" disabled>
                        Select time
                      </option>
                      {checkOutTimeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    id="adults"
                    label="Number of Adults"
                    type="number"
                    min="1"
                    value={bookingDetails.adults}
                    onChange={(e) => handleBookingDetailChange("adults", parseInt(e.target.value, 10) || 1)}
                  />
                  <Input
                    id="children"
                    label="Number of Children"
                    type="number"
                    min="0"
                    value={bookingDetails.children}
                    onChange={(e) => handleBookingDetailChange("children", parseInt(e.target.value, 10) || 0)}
                  />
                </div>

                {/* Optional helper info for Hourly */}
                {bookingType === "Hourly" && stayDurationHours > 0 && (
                  <div className="text-sm text-gray-600 bg-gray-50 border rounded-xl p-3">
                    Duration: <span className="font-semibold text-gray-900">{stayDurationHours.toFixed(1)} hours</span>
                    {bookingDetails.checkInTime && bookingDetails.checkOutTime && bookingDetails.checkOutTime <= bookingDetails.checkInTime && (
                      <span className="ml-2 text-purple-700 font-semibold">(crosses midnight)</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Available Rooms */}
            {showRooms && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm">
                      <BedDouble size={20} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">Select Rooms</h2>
                      <p className="text-xs text-purple-100">Choose available rooms for your booking</p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <Select id="floor-filter" label="Filter by Floor" value={floorFilter} onChange={(e) => setFloorFilter(e.target.value)}>
                      {floorOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </Select>

                    <Select id="type-filter" label="Filter by Room Type" value={roomTypeFilter} onChange={(e) => setRoomTypeFilter(e.target.value)}>
                      {roomTypeOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {isLoadingRooms ? (
                    <div className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <p className="font-medium">Loading available rooms...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredDisplayRooms.length > 0 ? (
                        filteredDisplayRooms.map((room) => {
                          const isSelected = selectedRooms.some((r) => r.roomCode === room.roomCode);
                          return <RoomCard key={room.roomCode} room={room} isSelected={isSelected} onSelect={() => toggleRoomSelection(room)} />;
                        })
                      ) : (
                        <div className="col-span-full">
                          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <BedDouble size={48} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500 font-medium">No available rooms found</p>
                            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section 3: Guest Information */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm">
                  <Users size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Guest Information</h2>
                  <p className="text-xs text-blue-100">Enter details for all guests</p>
                </div>
              </div>
            </div>

              <div className="p-6">
                {!areGuestsValid && (
                  <div className="flex items-start gap-3 bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Required Information Missing</p>
                      <p className="text-sm mt-1">
                        Please ensure the <strong>Main Booker's name</strong> is entered and all accompanying guests are named before submitting.
                      </p>
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-md font-semibold text-gray-700 mb-4 flex items-center gap-2 pb-3 border-b">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users size={16} className="text-blue-600" />
                    </div>
                    Main Booker
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      id="guest-name"
                      label="Guest Name"
                      value={mainBooker.name}
                      onChange={(e) => setMainBooker({ ...mainBooker, name: e.target.value })}
                      required
                    />
                    <Input
                      id="guest-email"
                      label="Email (Optional)"
                      type="email"
                      value={mainBooker.email}
                      onChange={(e) => setMainBooker({ ...mainBooker, email: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-md font-semibold text-gray-700 mb-4 flex items-center gap-2 pb-3 border-b">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <Users size={16} className="text-purple-600" />
                    </div>
                    Accompanying Guests
                  </h3>

                  <div className="space-y-4">
                    {accompanyingGuests.map((guest, index) => (
                      <div
                        key={guest.id}
                        className="group grid grid-cols-1 md:grid-cols-[1fr_auto_auto] items-end gap-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-sm transition-all duration-200"
                      >
                        <Input
                          id={`guest-name-${guest.id}`}
                          label={`Guest ${index + 2} Name`}
                          value={guest.name}
                          onChange={(e) => handleGuestChange(guest.id, "name", e.target.value)}
                          required
                        />
                        <Select
                          id={`guest-type-${guest.id}`}
                          label="Type"
                          value={guest.guestType}
                          onChange={(e) => handleGuestChange(guest.id, "guestType", e.target.value)}
                        >
                          <option>Adult</option>
                          <option>Child</option>
                          <option>Infant</option>
                        </Select>
                        <button
                          type="button"
                          onClick={() => handleRemoveGuest(guest.id)}
                          className="group-hover:scale-105 p-2.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-all duration-200 shadow-sm"
                          title="Remove Guest"
                          aria-label={`Remove guest ${index + 2}`}
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <Button
                      type="button"
                      variant="secondary"
                      className="!border-2 !border-purple-500 !text-purple-600 !bg-white hover:!bg-purple-50 hover:!shadow-md !transition-all !duration-200"
                      onClick={handleAddGuest}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} />
                        Add Guest
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Summary & Confirmation */}
          <div className="w-full lg:w-[420px]">
            <div className="lg:sticky lg:top-6 bottom-0 left-0 fixed w-full lg:relative border-t lg:border-none rounded-t-3xl lg:rounded-2xl bg-white shadow-2xl lg:shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm">
                    <CheckCircle2 size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Booking Summary</h2>
                    <p className="text-xs text-blue-100">Review your booking details</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <dl className="space-y-1">
                  <SummaryRow
                    label="Main Guest"
                    value={
                      <span className={mainBooker.name ? "text-green-600 font-semibold" : "text-gray-400"}>
                        {mainBooker.name || "Not specified"}
                      </span>
                    }
                  />
                  {accompanyingGuests.length > 0 && (
                    <SummaryRow
                      label="Accompanying"
                      value={
                        <ul className="text-right space-y-1">
                          {accompanyingGuests.map((g) => (
                            <li key={g.id} className="text-gray-700">
                              {g.name || `Guest ${accompanyingGuests.indexOf(g) + 2}`}
                            </li>
                          ))}
                        </ul>
                      }
                    />
                  )}
                  <SummaryRow
                    label="Total Guests"
                    value={
                      <div className="flex items-center gap-1.5">
                        <Users size={14} className="text-blue-600" />
                        {bookingDetails.adults + bookingDetails.children}
                        <span className="text-xs text-gray-500">
                          ({bookingDetails.adults}A, {bookingDetails.children}C)
                        </span>
                      </div>
                    }
                  />
                  <SummaryRow label="Duration" value={<span className="text-xs leading-tight">{formattedStayDuration}</span>} />

                  {bookingType === "Overnight" && stayDuration > 0 && (
                    <SummaryRow
                      label="Nights"
                      value={
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">
                          {stayDuration} {stayDuration === 1 ? "night" : "nights"}
                        </span>
                      }
                    />
                  )}

                  {bookingType === "Hourly" && stayDurationHours > 0 && (
                    <SummaryRow
                      label="Hours"
                      value={
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-semibold">
                          {stayDurationHours.toFixed(1)} hrs
                        </span>
                      }
                    />
                  )}

                  <SummaryRow
                    label="Selected Rooms"
                    value={
                      selectedRooms.length > 0 ? (
                        <div className="space-y-2">
                          {selectedRooms.map((room) => (
                            <div key={room.roomCode} className="text-right">
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                                <BedDouble size={14} className="text-purple-600" />
                                <span className="font-semibold text-gray-900">{room.roomCode}</span>
                                <span className="text-xs text-gray-500">• {room.type}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">No rooms selected</span>
                      )
                    }
                  />
                </dl>

                <div className="mt-6 pt-6 border-t-2 border-dashed space-y-4">
                  <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      aria-label="Send check-in link"
                    />
                    <span className="text-sm text-gray-700 font-medium group-hover:text-blue-600 transition-colors">
                      📧 Send check-in link via email
                    </span>
                  </label>

                  <Button
                    size="lg"
                    className="w-full !bg-gradient-to-r !from-blue-600 !to-purple-600 hover:!from-blue-700 hover:!to-purple-700 !shadow-lg hover:!shadow-xl !transform hover:!scale-[1.02] !transition-all !duration-200"
                    disabled={isSubmitDisabled}
                    onClick={handleSubmitBooking}
                    aria-disabled={isSubmitDisabled}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Processing...</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle2 size={20} />
                        {sendEmail && mainBooker.email ? "Submit & Send Link" : "Submit Booking"}
                      </span>
                    )}
                  </Button>

                  {isSubmitDisabled && !isLoading && (
                    <p className="text-xs text-center text-gray-500 mt-2">
                      {!areGuestsValid && "⚠️ Please complete guest information"}
                      {areGuestsValid && selectedRooms.length === 0 && "⚠️ Please select at least one room"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Room card
const RoomCard: React.FC<{ room: Room; isSelected: boolean; onSelect: () => void }> = ({ room, isSelected, onSelect }) => {
  return (
    <div
      className={`group relative border-2 rounded-xl p-5 flex flex-col justify-between transition-all duration-300 cursor-pointer overflow-hidden ${isSelected
          ? "border-blue-500 ring-4 ring-blue-100 shadow-lg scale-[1.02] bg-gradient-to-br from-blue-50 to-purple-50"
          : "border-gray-200 hover:border-purple-300 hover:shadow-md bg-white"
        }`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
    >
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full p-1.5 shadow-lg">
            <CheckCircle2 size={16} className="animate-pulse" />
          </div>
        </div>
      )}

      <div>
        <div className="flex items-start justify-between mb-3">
          <div
            className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 ${isSelected ? "bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg" : "bg-gray-100 group-hover:bg-purple-100"
              }`}
          >
            <BedDouble size={20} className={isSelected ? "text-white" : "text-gray-600 group-hover:text-purple-600"} />
          </div>
        </div>

        <h3 className={`font-bold mb-1 transition-colors ${isSelected ? "text-blue-700" : "text-gray-800 group-hover:text-purple-700"}`}>
          {room.type}
        </h3>

        <div className="space-y-1.5">
          <p className="text-sm text-gray-600 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Room: <span className="font-semibold text-gray-900">{room.roomCode}</span>
          </p>
          <p className="text-sm text-gray-600 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            Floor: <span className="font-semibold text-gray-900">{room.floor}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <span
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 w-full justify-center ${isSelected
              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
              : "bg-gray-100 text-gray-700 group-hover:bg-purple-100 group-hover:text-purple-700"
            }`}
        >
          {isSelected ? (
            <>
              <CheckCircle2 size={14} />
              Selected
            </>
          ) : (
            <>
              <Sparkles size={14} />
              Available
            </>
          )}
        </span>
      </div>
    </div>
  );
};

export default CreateBooking;
