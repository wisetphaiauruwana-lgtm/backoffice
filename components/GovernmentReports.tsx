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

// ============================================================================
// TYPES
// ============================================================================

interface ReportGuest {
  checkInDateTime: string;
  roomNumber: string;
  fullName: string;
  nationality: string;
  idNumber: string;
  currentAddress: string;
  checkOutDateTime: string | null;
  remarks: string;
}

interface DateRange {
  start: string;
  end: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ENTRIES_PER_PAGE_OPTIONS = [10, 25, 50];
const MAX_PAGE_BUTTONS = 5;

const PRINT_STYLES = `
  @page { 
    size: A4 landscape; 
    margin: 8mm; 
  }

  @media print {
    body * { visibility: hidden; }

    #print-table-only,
    #print-table-only * { visibility: visible; }

    #print-table-only {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      box-shadow: none !important;
      background: white;
    }

    #print-table-only table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000;
    }

    #print-table-only th,
    #print-table-only td {
      border: 1px solid #000;
      padding: 6px 8px;
      font-size: 11px;
      color: #000;
    }

    #print-table-only thead { display: table-header-group; }

    #print-table-only tr { page-break-inside: avoid; }

    .no-print { display: none !important; }
  }
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

  if (Array.isArray(booking.rooms) && booking.rooms.length > 0) {
    const roomNumbers = booking.rooms
      .map(
        (r: any) =>
          r?.room?.roomCode ||
          r?.room?.room_code ||
          r?.room?.roomNumber ||
          r?.room?.room_number ||
          ""
      )
      .filter(Boolean);

    if (roomNumbers.length > 0) return roomNumbers.join(", ");
  }

  return (
    booking.room?.roomCode ||
    booking.room?.room_code ||
    booking.room?.roomNumber ||
    booking.room?.room_number ||
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

// ============================================================================
// SUB COMPONENTS
// ============================================================================

const PageHeader: React.FC<{
  onExportExcel: () => void;
  onPrint: () => void;
}> = ({ onExportExcel, onPrint }) => (
  <div className="no-print mb-6">
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border flex items-center justify-center">
            <Building2 className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              Government Reports
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              R.R.4 Registry (ทะเบียนผู้พัก) — export Excel / print PDF
            </p>
          </div>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-2">
        <Button
          className="!bg-green-600 hover:!bg-green-700 focus:!ring-green-500"
          leftIcon={<FileSpreadsheet size={16} />}
          onClick={onExportExcel}
        >
          Export Excel
        </Button>

        <Button variant="secondary" leftIcon={<Printer size={16} />} onClick={onPrint}>
          Print / PDF
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
    <div className="flex items-center gap-2">
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

      <span className="text-gray-400 text-sm">to</span>

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
  <thead className="sticky top-0 bg-gray-100 text-black">
    <tr>
      <th className="border border-black px-2 py-2 text-center font-bold whitespace-nowrap">
        เลขลำดับ
      </th>
      <th className="border border-black px-2 py-2 text-center font-bold whitespace-nowrap">
        วันเวลาที่เข้ามาพัก
      </th>
      <th className="border border-black px-2 py-2 text-center font-bold whitespace-nowrap">
        ห้องพักเลขที่
      </th>
      <th className="border border-black px-2 py-2 text-center font-bold whitespace-nowrap">
        ชื่อตัวและชื่อสกุล
      </th>
      <th className="border border-black px-2 py-2 text-center font-bold whitespace-nowrap">
        สัญชาติ
      </th>
      <th className="border border-black px-2 py-2 text-center font-bold whitespace-nowrap">
        เลขประจำตัวประชาชน / หนังสือเดินทาง
      </th>
      <th className="border border-black px-2 py-2 text-center font-bold">
        ที่อยู่ปัจจุบัน
        <br />
        <span className="font-normal">(ตำบล / อำเภอ / จังหวัด / ประเทศ)</span>
      </th>
      <th className="border border-black px-2 py-2 text-center font-bold whitespace-nowrap">
        วันเวลาที่ออกไป
      </th>
      <th className="border border-black px-2 py-2 text-center font-bold whitespace-nowrap">
        หมายเหตุ
      </th>
    </tr>
  </thead>
);

const ReportTableRow: React.FC<{ guest: ReportGuest; index: number; rowNumber: number }> = ({
  guest,
  index,
  rowNumber,
}) => (
  <tr
    className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-yellow-50 transition`}
  >
    <td className="border border-black p-1 text-center align-top">{rowNumber}</td>
    <td className="border border-black p-1 text-center align-top">{guest.checkInDateTime}</td>
    <td className="border border-black p-1 text-center align-top">{guest.roomNumber}</td>
    <td className="border border-black p-1 align-top">{guest.fullName}</td>
    <td className="border border-black p-1 text-center align-top">{guest.nationality}</td>
    <td className="border border-black p-1 align-top">{guest.idNumber}</td>
    <td className="border border-black p-1 align-top">{guest.currentAddress}</td>
    <td className="border border-black p-1 text-center align-top">{guest.checkOutDateTime || ""}</td>
    <td className="border border-black p-1 align-top">{guest.remarks}</td>
  </tr>
);

const PaginationControls: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
  const renderPageNumbers = () => {
    const pageNumbers: React.ReactNode[] = [];
    let startPage: number, endPage: number;

    if (totalPages <= MAX_PAGE_BUTTONS) {
      startPage = 1;
      endPage = totalPages;
    } else {
      const halfMax = Math.floor(MAX_PAGE_BUTTONS / 2);
      const afterHalf = Math.ceil(MAX_PAGE_BUTTONS / 2) - 1;

      if (currentPage <= halfMax) {
        startPage = 1;
        endPage = MAX_PAGE_BUTTONS;
      } else if (currentPage + afterHalf >= totalPages) {
        startPage = totalPages - MAX_PAGE_BUTTONS + 1;
        endPage = totalPages;
      } else {
        startPage = currentPage - halfMax;
        endPage = currentPage + afterHalf;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`px-3 py-1.5 text-sm rounded-lg border transition ${
            currentPage === i
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
          }`}
        >
          {i}
        </button>
      );
    }

    return pageNumbers;
  };

  return (
    <nav aria-label="Pagination" className="flex items-center space-x-1">
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

      {renderPageNumbers()}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || totalPages === 0}
        className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Next Page"
      >
        <ChevronRight size={16} />
      </button>

      <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages || totalPages === 0}
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
      const anyGuest = guest as any;
      const bookingId = anyGuest.bookingId ?? anyGuest.booking_id;
      const booking = getBookingById(bookingId) as any;

      const checkInDate = formatDateOnly(
        booking?.checkInDate ??
          booking?.check_in_date ??
          booking?.startDate ??
          booking?.start_date ??
          anyGuest.createdAt ??
          anyGuest.created_at
      );

      const checkOutDate = formatDateOnly(
        booking?.checkOutDate ??
          booking?.check_out_date ??
          booking?.checkedOutAt ??
          booking?.checked_out_at ??
          booking?.endDate ??
          booking?.end_date ??
          null
      );

      return {
        checkInDateTime: checkInDate,
        roomNumber: getRoomNumber(bookingId),
        fullName: String(anyGuest.fullName ?? anyGuest.full_name ?? "-"),
        nationality: String(anyGuest.nationality ?? "—"),
        idNumber: String(anyGuest.idNumber ?? anyGuest.id_number ?? ""),
        currentAddress: String(anyGuest.currentAddress ?? anyGuest.current_address ?? ""),
        checkOutDateTime: checkOutDate === "-" ? null : checkOutDate,
        remarks: "",
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

    return rawReportData.filter((record) => {
      const checkInTimestamp = dateToTimestamp(record.checkInDateTime);
      const passesDateFilter =
        hasValidRange && !Number.isNaN(checkInTimestamp)
          ? checkInTimestamp >= startTimestamp && checkInTimestamp <= endTimestamp
          : true;

      if (!passesDateFilter) return false;

      if (!searchQuery) return true;

      const searchableText = [
        record.fullName,
        record.nationality,
        record.idNumber,
        record.roomNumber,
        record.currentAddress,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(searchQuery);
    });
  }, [rawReportData, appliedDateRange, searchTerm]);

  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredReportData.slice(indexOfFirstEntry, indexOfLastEntry);
  const totalPages = Math.ceil(filteredReportData.length / entriesPerPage);

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

  const handlePrint = () => window.print();

  const handleExportExcel = () => {
    if (!filteredReportData || filteredReportData.length === 0) {
      alert("No data to export");
      return;
    }

    const exportRows = filteredReportData.map((record, index) => ({
      No: index + 1,
      "Check-In Time": formatDateOnly(record.checkInDateTime),
      "Room Number": record.roomNumber,
      "Full Name": record.fullName,
      Nationality: record.nationality,
      "ID Number": record.idNumber,
      "Current Address": record.currentAddress,
      "Check-Out Time": record.checkOutDateTime ? formatDateOnly(record.checkOutDateTime) : "",
      Remarks: record.remarks ?? "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "RR4_Report");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `RR4_Report_${toLocalDateInput(new Date())}.xlsx`);
  };

  return (
    <div id="report-page" className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <style>{PRINT_STYLES}</style>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <PageHeader onExportExcel={handleExportExcel} onPrint={handlePrint} />

        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="no-print p-5 border-b bg-gradient-to-r from-gray-50 to-white">
            <div className="flex flex-col xl:flex-row xl:items-end gap-4 justify-between">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <SearchBar value={searchTerm} onChange={handleSearchChange} />
                <EntriesPerPageSelector value={entriesPerPage} onChange={handleEntriesPerPageChange} />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <DateRangePicker dateRange={dateRange} onChange={setDateRange} />

                <div className="flex items-center gap-2">
                  <Button variant="primary" onClick={applyFilters}>
                    Generate
                  </Button>

                  <div className="md:hidden flex items-center gap-2">
                    <Button
                      className="!bg-green-600 hover:!bg-green-700 focus:!ring-green-500"
                      leftIcon={<FileSpreadsheet size={16} />}
                      onClick={handleExportExcel}
                    >
                      Excel
                    </Button>
                    <Button variant="secondary" leftIcon={<Printer size={16} />} onClick={handlePrint}>
                      Print
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <FilterSummary
              appliedRange={appliedDateRange}
              searchTerm={searchTerm}
              totalResults={filteredReportData.length}
              isLoading={isLoading}
            />
          </div>

          <div id="print-table-only" className="overflow-x-auto">
            <div className="px-5 pt-5 pb-2">
              <h3 className="text-center font-bold text-lg">ทะเบียนผู้พัก (ร.ร.๔)</h3>
              <p className="text-center text-xs text-gray-500 mt-1">
                วันที่พิมพ์: {new Date().toLocaleString()}
              </p>
            </div>

            <table className="min-w-full text-xs border-collapse border border-black">
              <ReportTableHeader />

              <tbody className="bg-white text-black">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="border border-black p-6 text-center">
                      <span className="inline-flex items-center gap-2 text-gray-700">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading data…
                      </span>
                    </td>
                  </tr>
                ) : currentEntries.length > 0 ? (
                  currentEntries.map((guest, index) => (
                    <ReportTableRow
                      key={index}
                      guest={guest}
                      index={index}
                      rowNumber={indexOfFirstEntry + index + 1}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center p-6 border border-black text-gray-700">
                      No guest data for the selected date range / search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="no-print flex flex-col sm:flex-row justify-between items-center p-5 border-t gap-4">
            <div className="text-sm text-gray-600">
              Showing {filteredReportData.length > 0 ? indexOfFirstEntry + 1 : 0} to{" "}
              {Math.min(indexOfLastEntry, filteredReportData.length)} of {filteredReportData.length} entries
            </div>

            <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        </div>

        <div className="no-print h-6" />
      </div>
    </div>
  );
};

export default GovernmentReports;
