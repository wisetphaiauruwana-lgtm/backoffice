import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";

export interface BookingsContextType {
  bookings: any[];
  setBookings: React.Dispatch<React.SetStateAction<any[]>>;
  refreshBookings: (opts?: { force?: boolean }) => Promise<void>;
  fetchBookings: (opts?: { force?: boolean }) => Promise<void>;
}

const BookingsContext = createContext<BookingsContextType | null>(null);

export const BookingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookings, setBookings] = useState<any[]>([]);

  // ✅ กันยิงซ้ำซ้อน (เรียกพร้อมกันหลายหน้า)
  const inFlightRef = useRef<Promise<void> | null>(null);

  // ✅ cache ลดการยิงถี่ ๆ
  const lastFetchedAtRef = useRef<number>(0);
  const CACHE_MS = 10_000; // 10 วินาที

  const refreshBookings = useCallback(async (opts?: { force?: boolean }) => {
    const force = !!opts?.force;
    const now = Date.now();

    // cache hit (มีข้อมูลอยู่แล้ว + ยังไม่หมดอายุ)
    if (!force && bookings.length > 0 && now - lastFetchedAtRef.current < CACHE_MS) {
      return;
    }

    // ถ้ามี request ที่กำลังทำอยู่ ให้รออันเดิม (dedupe)
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    const p = (async () => {
      try {
        const { bookingsService } = await import("../services/bookings.service");
        const data = await bookingsService.fetchAll();
        setBookings(Array.isArray(data) ? data : []);
        lastFetchedAtRef.current = Date.now();
      } catch (e) {
        console.error("Failed to refresh bookings:", e);
        setBookings([]); // กัน state ค้าง
      } finally {
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = p;
    return p;
  }, [bookings]);

  // โหลดครั้งแรกตอน Provider mount (ยังคงไว้ได้ เพราะมี dedupe+cache แล้ว)
  useEffect(() => {
    refreshBookings();
  }, [refreshBookings]);

  const value = useMemo(
    () => ({
      bookings,
      setBookings,
      refreshBookings,
      fetchBookings: refreshBookings,
    }),
    [bookings, refreshBookings]
  );

  return <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>;
};

export const useBookings = () => {
  const ctx = useContext(BookingsContext);
  if (!ctx) {
    throw new Error("useBookings must be used inside <BookingsProvider>");
  }
  return ctx;
};
