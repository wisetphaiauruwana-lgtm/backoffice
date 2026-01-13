import React, { useState, useMemo, useEffect, useCallback } from "react";
import { guestsService } from "../services/guests.service";
import { bookingsService } from "../services/bookings.service";
import { Guest, Booking } from "../types";
import Button from "./ui/Button";
import {
  Printer,
  Calendar,
  FileSpreadsheet,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Search,
  Building2,
  Loader2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { usePermissions } from "../hooks/usePermissions";
import AccessDenied from "./ui/AccessDenied";

// ============================================================================
// TYPES
// ============================================================================

interface ReportGuest {
  checkInDateTime: string; // YYYY-MM-DD
  roomNumber: string;
  fullName: string;
  nationality: string;
  idNumber: string;
  currentAddress: string;
  checkOutDateTime: string | null; // YYYY-MM-DD | null
  remarks: string;
}

interface DateRange {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ENTRIES_PER_PAGE_OPTIONS = [10, 25, 50];
const MAX_PAGE_BUTTONS = 5;

// ✅ Print + Screen styles
const PRINT_STYLES = `
@page {
  size: A4 landscape;
  margin: 10mm;
}

@media print {
  html, body { width: 100%; height: 100%; }
  body * { visibility: hidden; }

  #report-page, #report-page * { visibility: visible; }
  #report-page { position: absolute; left: 0; top: 0; width: 100%; }

  .no-print { display: none !important; }

  table { width: 100% !important; border-collapse: collapse !important; font-size: 12px !important; }
  thead { display: table-header-group; }  /* ✅ header repeats */
  tfoot { display: table-footer-group; }
  tr { page-break-inside: avoid; }
  td, th { break-inside: avoid; }
}

/* ✅ Screen: ช่วยให้เห็นครบคอลัมน์ง่ายขึ้น */
#report-page table { font-size: 11px; }
#report-page th, #report-page td { padding: 4px; }
`;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatDateOnly = (value?: string | null): string => {
  if (!value) return "-";
  const dateString = String(value);
  return dateString.includes("T") ? dateString.split("T")[0] : dateString;
};

const dateToTimestamp = (yyyyMmDd?: string | null): number => {
  if (!yyyyMmDd) return NaN;
  const match = String(yyyyMmDd).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return NaN;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return new Date(year, month, day, 0, 0, 0, 0).getTime();
};

const toLocalDateInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getWeekRange = (): DateRange => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const startDate = new Date(now);
  startDate.setDate(now.getDate() + daysToMonday);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  return { start: toLocalDateInput(startDate), end: toLocalDateInput(endDate) };
};

const extractRoomNumber = (booking: any): string => {
  if (!booking) return "-";

  // booking.rooms[] style
  if (Array.isArray(booking.rooms) && booking.rooms.length > 0) {
    const roomNumbers = booking.rooms
      .map(
        (r: any) =>
          r?.room?.roomCode ||
          r?.room?.room_code ||
          r?.room?.roomNumber ||
          r?.room?.room_number ||
          r?.roomCode ||
          r?.room_code ||
          r?.roomNumber ||
          r?.room_number ||
          ""
      )
      .filter(Boolean);

    if (roomNumbers.length > 0) return roomNumbers.join(", ");
  }

  // single room style
  return (
    booking.room?.roomCode ||
    booking.room?.room_code ||
    booking.room?.roomNumber ||
    booking.room?.room_number ||
    booking.roomCode ||
    booking.room_code ||
    booking.roomNumber ||
    booking.room_number ||
    "-"
  );
};

const buildBookingMap = (bookings: Booking[]): Map<string, any> => {
  const map = new Map<string, any>();
  for (const booking of bookings ?? []) {
    const id = String((booking as any)?.id ?? (booking as any)?.ID);
    if (id) map.set(id, booking);
  }
  return map;
};

const safeText = (v: any): string => {
  if (v === null || v === undefined) return "";
  return String(v).trim();
};

const buildFullName = (g: any): string => {
  const first =
    g?.firstName ||
    g?.first_name ||
    g?.givenName ||
    g?.given_name ||
    g?.name ||
    g?.fullName ||
    g?.full_name ||
    "";
  const last =
    g?.lastName ||
    g?.last_name ||
    g?.surname ||
    g?.familyName ||
    g?.family_name ||
    "";

  const full = `${safeText(first)} ${safeText(last)}`.trim();
  return full || safeText(g?.fullName || g?.full_name) || "-";
};

const buildIdNumber = (g: any): string => {
  return (
    safeText(g?.idNumber) ||
    safeText(g?.id_number) ||
    safeText(g?.citizenId) ||
    safeText(g?.citizen_id) ||
    safeText(g?.passportNumber) ||
    safeText(g?.passport_number) ||
    "-"
  );
};

const buildAddress = (g: any): string => {
  const direct =
    safeText(g?.currentAddress) ||
    safeText(g?.current_address) ||
    safeText(g?.address) ||
    safeText(g?.current_address_text);

  if (direct) return direct;

  const subdistrict = safeText(g?.subdistrict || g?.tambon);
  const district = safeText(g?.district || g?.amphoe);
  const province = safeText(g?.province);
  const country = safeText(g?.country);

  const parts = [subdistrict, district, province, country].filter(Boolean);
  return parts.length ? parts.join(" / ") : "-";
};

const guestInRange = (checkInISO: string, startTs: number, endTs: number): boolean => {
  const d = new Date(checkInISO);
  if (Number.isNaN(d.getTime())) return true;
  const ts = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
  return ts >= startTs && ts <= endTs;
};

// ============================================================================
// SUB COMPONENTS
// ============================================================================

const PageHeader: React.FC<{
  onExportExcel: () => void;
  onPrint: () => void;
  loading: boolean;
}> = ({ onExportExcel, onPrint, loading }) => (
  <div className="no-print mb-6">
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-50 border flex items-center justify-center">
          <Building2 className="h-5 w-5 text-blue-700" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Government Reports</h1>
          <p className="text-sm text-gray-500 mt-1">R.R.4 Registry (ทะเบียนผู้พัก) — export Excel / print</p>
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <Button onClick={onExportExcel} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
          <span className="ml-2">Export Excel</span>
        </Button>

        <Button onClick={onPrint} disabled={loading}>
          <Printer className="h-4 w-4" />
          <span className="ml-2">Print</span>
        </Button>
      </div>
    </div>
  </div>
);

const SearchBar: React.FC<{ value: string; onChange: (value: string) => void }> = ({
  value,
  onChange,
}) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1">Search</label>
    <div className="relative">
      <Search className="absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-gray-400" />
      <input
        type="text"
        placeholder="Search by guest / room / ID..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full sm:w-80 pl-10 pr-4 py-2.5 bg-white text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>
);

const EntriesPerPageSelector: React.FC<{
  value: number;
  onChange: (value: number) => void;
}> = ({ value, onChange }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1">Rows</label>
    <div className="flex items-center gap-2 text-sm text-gray-700">
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
        aria-label="Entries per page"
      >
        {ENTRIES_PER_PAGE_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="text-gray-500">per page</span>
    </div>
  </div>
);

const DateRangePicker: React.FC<{
  dateRange: DateRange;
  onChange: (dateRange: DateRange) => void;
}> = ({ dateRange, onChange }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1">Date range</label>
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus-within:ring-2 focus-within:ring-blue-500">
        <Calendar size={16} className="text-gray-600" />
        <input
          type="date"
          aria-label="Start Date"
          value={dateRange.start}
          onChange={(e) => onChange({ ...dateRange, start: e.target.value })}
          className="text-sm bg-white text-gray-900 focus:outline-none"
        />
      </div>

      <span className="text-gray-400">→</span>

      <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus-within:ring-2 focus-within:ring-blue-500">
        <Calendar size={16} className="text-gray-600" />
        <input
          type="date"
          aria-label="End Date"
          value={dateRange.end}
          onChange={(e) => onChange({ ...dateRange, end: e.target.value })}
          className="text-sm bg-white text-gray-900 focus:outline-none"
        />
      </div>
    </div>
  </div>
);

const FilterSummary: React.FC<{
  appliedRange: DateRange;
  searchTerm: string;
  totalResults: number;
  isLoading: boolean;
}> = ({ appliedRange, searchTerm, totalResults, isLoading }) => (
  <div className="mt-4 text-xs text-gray-500 flex flex-wrap items-center gap-2">
    <span className="px-2 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-semibold">
      Applied: {appliedRange.start} → {appliedRange.end}
    </span>
    {searchTerm.trim() && (
      <span className="px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-700">
        Search: "{searchTerm.trim()}"
      </span>
    )}
    <span className="ml-auto">{isLoading ? "Loading..." : `Total: ${totalResults} row(s)`}</span>
  </div>
);

const ReportTableHeader: React.FC = () => (
  <thead className="bg-gray-100 text-black">
    <tr>
      <th className="border border-black px-1 py-1 text-center font-bold">เลขลำดับ</th>
      <th className="border border-black px-1 py-1 text-center font-bold">วันเวลาที่เข้ามาพัก</th>
      <th className="border border-black px-1 py-1 text-center font-bold">ห้องพักเลขที่</th>
      <th className="border border-black px-1 py-1 text-center font-bold">ชื่อตัวและชื่อสกุล</th>
      <th className="border border-black px-1 py-1 text-center font-bold">สัญชาติ</th>
      <th className="border border-black px-1 py-1 text-center font-bold">
        เลขประจำตัวประชาชน / หนังสือเดินทาง
      </th>
      <th className="border border-black px-1 py-1 text-center font-bold">
        ที่อยู่ปัจจุบัน
        <div className="font-normal text-[10px]">(ตำบล / อำเภอ / จังหวัด / ประเทศ)</div>
      </th>
      <th className="border border-black px-1 py-1 text-center font-bold">วันเวลาที่ออกไป</th>
      <th className="border border-black px-1 py-1 text-center font-bold">หมายเหตุ</th>
    </tr>
  </thead>
);

const ReportTableRow: React.FC<{ guest: ReportGuest; index: number; rowNumber: number }> = ({
  guest,
  index,
  rowNumber,
}) => (
  <tr className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
    <td className="border border-black px-1 py-1 text-center align-top">{rowNumber}</td>
    <td className="border border-black px-1 py-1 text-center align-top">{guest.checkInDateTime}</td>
    <td className="border border-black px-1 py-1 text-center align-top">{guest.roomNumber}</td>
    <td className="border border-black px-1 py-1 align-top break-words">{guest.fullName}</td>
    <td className="border border-black px-1 py-1 text-center align-top">{guest.nationality}</td>
    <td className="border border-black px-1 py-1 align-top break-words">{guest.idNumber}</td>
    <td className="border border-black px-1 py-1 align-top break-words whitespace-pre-wrap">
      {guest.currentAddress}
    </td>
    <td className="border border-black px-1 py-1 text-center align-top">{guest.checkOutDateTime || ""}</td>
    <td className="border border-black px-1 py-1 align-top break-words">{guest.remarks}</td>
  </tr>
);

const PaginationControls: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
  const pages = useMemo(() => {
    if (totalPages <= 1) return [];
    const half = Math.floor(MAX_PAGE_BUTTONS / 2);

    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + MAX_PAGE_BUTTONS - 1);
    start = Math.max(1, end - MAX_PAGE_BUTTONS + 1);

    const arr: number[] = [];
    for (let p = start; p <= end; p++) arr.push(p);
    return arr;
  }, [currentPage, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="no-print flex items-center justify-center gap-1 mt-4">
      <button
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        title="First Page"
      >
        <ChevronsLeft size={16} />
      </button>

      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Previous Page"
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`px-3 py-2 rounded-lg border text-sm ${
            p === currentPage
              ? "border-blue-500 bg-blue-50 text-blue-700 font-bold"
              : "border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
        >
          {p}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Next Page"
      >
        <ChevronRight size={16} />
      </button>

      <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Last Page"
      >
        <ChevronsRight size={16} />
      </button>
    </nav>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const GovernmentReports: React.FC = () => {
  const { can, role } = usePermissions();
  const canView = can("tm30Verification", "view");
  const normalizedRole = String(role || "").trim().toLowerCase();
  const canExport =
    can("tm30Verification", "export") || normalizedRole === "owner" || normalizedRole === "manager";
  const initialWeek = getWeekRange();

  const [dateRange, setDateRange] = useState<DateRange>(initialWeek);
  const [appliedDateRange, setAppliedDateRange] = useState<DateRange>(initialWeek);

  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  const [guests, setGuests] = useState<Guest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [guestResponse, bookingResponse] = await Promise.all([
        guestsService.fetchAll(),
        bookingsService.fetchAll(),
      ]);
      setGuests(guestResponse ?? []);
      setBookings(bookingResponse ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const bookingMap = useMemo(() => buildBookingMap(bookings), [bookings]);

  const getBookingById = useCallback(
    (bookingId?: number | string | null) => {
      if (!bookingId) return null;
      return bookingMap.get(String(bookingId)) ?? null;
    },
    [bookingMap]
  );

  const getRoomNumber = useCallback(
    (bookingId?: number | string | null): string => {
      const booking = getBookingById(bookingId);
      return extractRoomNumber(booking);
    },
    [getBookingById]
  );

  const rawReportData = useMemo<ReportGuest[]>(() => {
    return (guests ?? []).map((guest) => {
      const g: any = guest as any;

      const bookingId = g.bookingId ?? g.booking_id ?? g.booking?.id ?? g.booking?.ID ?? null;
      const booking: any = getBookingById(bookingId);

      const checkIn =
        g.checkInDateTime ||
        g.check_in_date_time ||
        g.checkIn ||
        g.check_in ||
        booking?.checkInDateTime ||
        booking?.check_in_date_time ||
        booking?.checkIn ||
        booking?.check_in ||
        booking?.createdAt ||
        booking?.created_at ||
        null;

      const checkOut =
        g.checkOutDateTime ||
        g.check_out_date_time ||
        g.checkOut ||
        g.check_out ||
        booking?.checkOutDateTime ||
        booking?.check_out_date_time ||
        booking?.checkOut ||
        booking?.check_out ||
        null;

      const roomNumber = getRoomNumber(bookingId);
      const fullName = buildFullName(g);
      const nationality =
        safeText(g.nationality || g.nationality_code || g.country || g.country_code) || "-";
      const idNumber = buildIdNumber(g);
      const currentAddress = buildAddress(g);
      const remarks = safeText(g.remarks || g.note || g.notes) || "";

      return {
        checkInDateTime: formatDateOnly(checkIn),
        roomNumber,
        fullName,
        nationality,
        idNumber,
        currentAddress,
        checkOutDateTime: checkOut ? formatDateOnly(checkOut) : null,
        remarks,
      };
    });
  }, [guests, getRoomNumber, getBookingById]);

  const filteredReportData = useMemo(() => {
    const searchQuery = searchTerm.trim().toLowerCase();

    const startTimestamp = dateToTimestamp(appliedDateRange.start);
    const endTimestamp = dateToTimestamp(appliedDateRange.end);

    const hasValidRange =
      !Number.isNaN(startTimestamp) &&
      !Number.isNaN(endTimestamp) &&
      startTimestamp <= endTimestamp;

    const endInclusive = hasValidRange ? endTimestamp : NaN;

    return rawReportData.filter((row) => {
      if (hasValidRange) {
        if (!guestInRange(row.checkInDateTime, startTimestamp, endInclusive)) return false;
      }

      if (!searchQuery) return true;

      const hay = [
        row.fullName,
        row.roomNumber,
        row.idNumber,
        row.nationality,
        row.currentAddress,
        row.checkInDateTime,
        row.checkOutDateTime ?? "",
        row.remarks,
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(searchQuery);
    });
  }, [rawReportData, appliedDateRange, searchTerm]);

  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredReportData.slice(indexOfFirstEntry, indexOfLastEntry);
  const totalPages = Math.max(1, Math.ceil(filteredReportData.length / entriesPerPage));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) setCurrentPage(pageNumber);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleEntriesPerPageChange = (value: number) => {
    setEntriesPerPage(value);
    setCurrentPage(1);
  };

  const applyFilters = () => {
    setAppliedDateRange(dateRange);
    setCurrentPage(1);
  };

  const handlePrint = () => {
    if (!canExport) return;
    window.print();
  };

  const handleExportExcel = () => {
    if (!canExport) return;
    if (!filteredReportData || filteredReportData.length === 0) {
      alert("No data to export");
      return;
    }

    const rows = filteredReportData.map((r, idx) => ({
      "เลขลำดับ": idx + 1,
      "วันเวลาที่เข้ามาพัก": r.checkInDateTime,
      "ห้องพักเลขที่": r.roomNumber,
      "ชื่อตัวและชื่อสกุล": r.fullName,
      "สัญชาติ": r.nationality,
      "เลขประจำตัวประชาชน / หนังสือเดินทาง": r.idNumber,
      "ที่อยู่ปัจจุบัน (ตำบล/อำเภอ/จังหวัด/ประเทศ)": r.currentAddress,
      "วันเวลาที่ออกไป": r.checkOutDateTime ?? "",
      หมายเหตุ: r.remarks,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RR4");

    const cols = Object.keys(rows[0] ?? {}).map((k) => ({
      wch: Math.min(60, Math.max(k.length, ...rows.map((r: any) => String(r[k] ?? "").length)) + 2),
    }));
    (ws as any)["!cols"] = cols;

    const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([arrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const filename = `RR4_${appliedDateRange.start}_to_${appliedDateRange.end}.xlsx`;
    saveAs(blob, filename);
  };

  if (!canView) {
    return <AccessDenied message="You do not have permission to view government reports." />;
  }

  return (
    <div id="report-page" className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <style>{PRINT_STYLES}</style>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <PageHeader onExportExcel={handleExportExcel} onPrint={handlePrint} loading={isLoading || !canExport} />

        {/* Filters */}
        <div className="no-print bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
            <div className="flex flex-wrap items-end gap-4">
              <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
              <Button onClick={applyFilters} disabled={isLoading}>
                Apply
              </Button>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <SearchBar value={searchTerm} onChange={handleSearchChange} />
              <EntriesPerPageSelector value={entriesPerPage} onChange={handleEntriesPerPageChange} />
            </div>
          </div>

          <FilterSummary
            appliedRange={appliedDateRange}
            searchTerm={searchTerm}
            totalResults={filteredReportData.length}
            isLoading={isLoading}
          />
        </div>

        {/* Table */}
        <div className="mt-4 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-hidden">
            <table className="w-full table-fixed border-collapse text-xs">
              {/* ✅ กำหนดความกว้างแต่ละคอลัมน์ เพื่อให้ “เห็นครบ” */}
              <colgroup>
                <col style={{ width: "6%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "25%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "7%" }} />
              </colgroup>

              <ReportTableHeader />

              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="p-6 text-center text-gray-500" colSpan={9}>
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </div>
                    </td>
                  </tr>
                ) : currentEntries.length === 0 ? (
                  <tr>
                    <td className="p-6 text-center text-gray-500" colSpan={9}>
                      No data found
                    </td>
                  </tr>
                ) : (
                  currentEntries.map((row, idx) => (
                    <ReportTableRow
                      key={`${row.idNumber}-${row.checkInDateTime}-${idx}`}
                      guest={row}
                      index={idx}
                      rowNumber={indexOfFirstEntry + idx + 1}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between no-print">
            <div className="text-xs text-gray-500">
              Page {currentPage} / {totalPages}
            </div>
            <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GovernmentReports;
