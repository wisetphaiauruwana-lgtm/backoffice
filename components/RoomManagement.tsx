// src/components/RoomManagement.tsx
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useData } from "../contexts/DataContext";
import { Room, RoomStatus, RoomType, BookingStatus, Customer } from "../types";
import { roomsService } from "../services/rooms.service";
import { ApiError } from "../services/apiService";

import Button from "./ui/Button";
import Modal from "./ui/Modal";
import ConfirmationModal from "./ui/ConfirmationModal";
import RoomDetailsModal from "./RoomDetailsModal";
import Table, { Column } from "./ui/Table";

import {
  PlusCircle,
  Trash2,
  Eye,
  Pencil,
  Search,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  BedDouble,
  Filter,
  Sparkles,
  Home,
} from "lucide-react";
const WORD_LIMIT = 300;

const countWords = (text: string) => {
  const t = (text ?? "").trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
};

const clampToWordLimit = (text: string, limit: number) => {
  const t = (text ?? "").trim();
  if (!t) return "";
  const words = t.split(/\s+/).filter(Boolean);

  if (words.length <= limit) return text;

  return words.slice(0, limit).join(" ");
};

type TableRoom = Room & { id: number | string };

const RoomManagement: React.FC = () => {
  const { rooms, customers, setRooms, fetchRooms } = useData();
  const location = useLocation();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(20);
  const [highlightedRoomCode, setHighlightedRoomCode] = useState<string | null>(
    null
  );

  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");

  const [floorFilter, setFloorFilter] = useState("All Floors");
  const [roomTypeFilter, setRoomTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All Status");

  const newRoomTypes: RoomType[] = ["Standard", "Superior", "Deluxe", "Connecting"];

  const getRoomTypeIdFromType = (roomType: RoomType): number => {
    const typeMap: { [key in RoomType]: number } = {
      Standard: 1,
      Superior: 2,
      Deluxe: 3,
      Connecting: 4,
    };
    return typeMap[roomType] ?? 0;
  };

  const initialNewRoomState = {
    roomCode: "",
    floor: "1st Floor",
    type: "Standard" as RoomType,
    maxOccupancy: 2,
    status: RoomStatus.Available,
    description: "",
    price: 0,
  };

  const [newRoom, setNewRoom] =
    useState<typeof initialNewRoomState>(initialNewRoomState);


  const descriptionWordCount = useMemo(
    () => countWords(newRoom.description),
    [newRoom.description]
  );

  // ✅ unify room identity for mapping guests & lookups
  const getRoomKey = (obj: any) => {
    return String(obj?.roomCode ?? obj?.roomNumber ?? obj?.roomNo ?? "").trim();
  };

  const floorOptions = useMemo(() => {
    const floors = Array.from(new Set((rooms ?? []).map((r) => r.floor))).filter(
      Boolean
    );
    floors.sort((a: string, b: string) => {
      const na = parseInt(a) || NaN;
      const nb = parseInt(b) || NaN;
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return String(a).localeCompare(String(b));
    });
    return ["All Floors", ...floors];
  }, [rooms]);

  const roomTypeOptions = useMemo(() => ["All Types", ...newRoomTypes], []);
  const statusOptions = useMemo(
    () => ["All Status", ...Object.values(RoomStatus)],
    []
  );

  // ✅ Map current checked-in guest by roomKey
  const guestInfoMap = useMemo(() => {
    const map = new Map<string, Customer>();

    (customers ?? []).forEach((customer) => {
      (customer.roomStays ?? []).forEach((rs: any) => {
        const key = getRoomKey(rs);
        if (rs.bookingStatus === BookingStatus.CheckedIn && key) {
          map.set(key, customer);
        }
      });
    });

    return map;
  }, [customers]);

  const getStatusBadgeClasses = (status: RoomStatus) => {
    const statusClasses: Record<RoomStatus, string> = {
      [RoomStatus.Available]: "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 ring-2 ring-green-200",
      [RoomStatus.Occupied]: "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 ring-2 ring-red-200",
      [RoomStatus.Cleaning]: "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 ring-2 ring-blue-200",
      [RoomStatus.Maintenance]: "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 ring-2 ring-gray-200",
    };
    return statusClasses[status] ?? "bg-gray-100 text-gray-800";
  };

  const handleUpdateRoom = (roomId: string, field: keyof Room, value: any) => {
    setRooms((currentRooms) =>
      (currentRooms ?? []).map((room) => {
        const idStr = String((room as any).id ?? (room as any).ID ?? "");
        if (idStr === String(roomId)) {
          const updatedValue = field === "maxOccupancy" ? Number(value) : value;
          return { ...room, [field]: updatedValue };
        }
        return room;
      })
    );
  };

  const handleGuestDoubleClick = (customer: Customer) => {
    const email = (customer as any)?.email;
    if (email) {
      navigate("/customers", { state: { highlight: email } });
    }
  };

  const filteredRooms = useMemo(() => {
    return (rooms ?? [])
      .filter((room) => {
        if (!searchTerm.trim()) return true;
        const code = String(room.roomCode ?? room.roomNumber ?? "").toLowerCase();
        return code.includes(searchTerm.toLowerCase().trim());
      })
      .filter((room) => floorFilter === "All Floors" || room.floor === floorFilter)
      .filter((room) => roomTypeFilter === "All Types" || room.type === roomTypeFilter)
      .filter((room) => statusFilter === "All Status" || room.status === statusFilter);
  }, [rooms, searchTerm, floorFilter, roomTypeFilter, statusFilter]);

  const sortedRooms = useMemo(() => {
    return [...filteredRooms].sort((a, b) =>
      String(a.roomCode ?? a.roomNumber ?? "").localeCompare(
        String(b.roomCode ?? b.roomNumber ?? ""),
        undefined,
        { numeric: true }
      )
    );
  }, [filteredRooms]);

  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const paginatedRooms = sortedRooms.slice(indexOfFirstEntry, indexOfLastEntry) as Room[];
  const totalPages = Math.ceil(sortedRooms.length / entriesPerPage);

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) setCurrentPage(pageNumber);
  };

  const stableFetchRooms = useCallback(async () => {
    try {
      if (fetchRooms) {
        await fetchRooms();
      } else {
        const data = await roomsService.fetchAll();
        setRooms(data as any);
      }
    } catch (error) {
      console.error("Initial Fetch Error:", error);
    }
  }, [fetchRooms, setRooms]);

  useEffect(() => {
    stableFetchRooms();
  }, [stableFetchRooms]);

  useEffect(() => {
    const highlight = (location.state as any)?.highlight;
    if (highlight) {
      setHighlightedRoomCode(highlight);

      const roomIndex = sortedRooms.findIndex(
        (r) => (r.roomCode ?? r.roomNumber) === highlight
      );
      if (roomIndex !== -1) {
        const pageNumber = Math.ceil((roomIndex + 1) / entriesPerPage);
        setCurrentPage(pageNumber);
      }

      navigate(location.pathname, { replace: true, state: null });

      const timer = setTimeout(() => setHighlightedRoomCode(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [location, sortedRooms, entriesPerPage, navigate]);

  const handleFilterChange = (
    setter: React.Dispatch<React.SetStateAction<any>>,
    value: any
  ) => {
    setter(value);
    setCurrentPage(1);
  };

  const renderPageNumbers = () => {
    const pageNumbers: React.ReactNode[] = [];
    const maxPageButtons = 5;
    let startPage: number, endPage: number;

    if (totalPages <= maxPageButtons) {
      startPage = 1;
      endPage = totalPages;
    } else {
      const maxPagesBeforeCurrent = Math.floor(maxPageButtons / 2);
      const maxPagesAfterCurrent = Math.ceil(maxPageButtons / 2) - 1;

      if (currentPage <= maxPagesBeforeCurrent) {
        startPage = 1;
        endPage = maxPageButtons;
      } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
        startPage = totalPages - maxPageButtons + 1;
        endPage = totalPages;
      } else {
        startPage = currentPage - maxPagesBeforeCurrent;
        endPage = currentPage + maxPagesAfterCurrent;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button
          key={i}
          type="button"
          onClick={() => handlePageChange(i)}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${currentPage === i
            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md scale-105"
            : "text-gray-600 hover:bg-gray-100 hover:scale-105"
            }`}
        >
          {i}
        </button>
      );
    }
    return pageNumbers;
  };

  // ✅ Open modal in modes
  const openViewRoom = (room: Room) => {
    setActiveRoom(room);
    setModalMode("view");
    setIsModalOpen(true);
  };

  const openEditRoom = (room: Room) => {
    setActiveRoom(room);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  // Create
  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedRoomTypeID = getRoomTypeIdFromType(newRoom.type);

    const normalizedRoomCode =
      (newRoom as any).roomCode ??
      (newRoom as any).roomNumber ??
      (newRoom as any).room_number ??
      "";

    const roomNumberTrimmed = String(normalizedRoomCode ?? "").trim();

    const roomToCreate: any = {
      roomNumber: roomNumberTrimmed,
      roomCode: roomNumberTrimmed,
      floor: newRoom.floor,
      type: newRoom.type,
      status: newRoom.status,
      description: newRoom.description,
      price: Number(newRoom.price ?? 0),
      maxOccupancy: Number(newRoom.maxOccupancy ?? 0),
    };

    if (Number.isInteger(selectedRoomTypeID) && selectedRoomTypeID > 0) {
      roomToCreate.roomTypeId = selectedRoomTypeID;
    }

    if (!roomToCreate.roomNumber) {
      alert("❌ กรุณากรอกหมายเลขห้อง (Room Number) ก่อนบันทึก");
      const el = document.getElementById("roomCode") as HTMLInputElement | null;
      if (el) {
        el.focus();
        el.select();
      }
      return;
    }

    try {
      await roomsService.create(roomToCreate as any);
      await stableFetchRooms();

      alert(`✅ Room ${roomToCreate.roomNumber} created successfully!`);
      setCreateModalOpen(false);
      setNewRoom(initialNewRoomState);
    } catch (error: any) {
      console.error("Error creating room:", error);

      if ((error as ApiError)?.status === 409) {
        const backendMsg = (error as ApiError).body?.message ?? error.message;
        alert(`❌ ${backendMsg}`);
        setCreateModalOpen(true);
        const el = document.getElementById("roomCode") as HTMLInputElement | null;
        if (el) {
          el.focus();
          el.select();
        }
        return;
      }

      const backendMsg = (error as ApiError)?.body?.message ?? error?.message;
      alert(
        `❌ Failed to create room: ${backendMsg || "Please check console/network tab."
        }`
      );
    }
  };

  // Delete ✅ (supports id / ID)
  const handleConfirmDelete = async () => {
    if (!roomToDelete) {
      setRoomToDelete(null);
      return;
    }

    const idCandidate =
      (roomToDelete as any).id ??
      (roomToDelete as any).ID ??
      (roomToDelete as any).roomId;

    const roomId = String(idCandidate ?? "").trim();
    const roomCode =
      (roomToDelete as any).roomCode ??
      (roomToDelete as any).roomNumber ??
      "—";

    if (!roomId) {
      console.error("❌ Cannot delete: room id missing:", roomToDelete);
      alert("❌ Delete failed: room id missing (check mapping in tableData)");
      setRoomToDelete(null);
      return;
    }

    try {
      await roomsService.remove(roomId);
      await stableFetchRooms();
      alert(`✅ Room ${roomCode} deleted successfully.`);
    } catch (error: any) {
      console.error("🔥 Delete Room Error:", error);
      alert(`❌ Failed to delete Room ${roomCode}: ${error?.message || "Check console"}`);
    }

    setRoomToDelete(null);
  };

  // ensure Table receives rows with `id` property
  const tableData: TableRoom[] = paginatedRooms.map((r) => {
    const idCandidate =
      (r as any).id ??
      (r as any).ID ??
      (r as any).roomId ??
      (r as any).numericId ??
      (r as any).roomNumber ??
      (r as any).roomCode;

    const id =
      typeof idCandidate === "number" || typeof idCandidate === "string"
        ? idCandidate
        : String(
          idCandidate ??
          (r as any).roomCode ??
          (r as any).roomNumber ??
          ""
        );

    return { ...(r as any), id } as TableRoom;
  });

  const columns: Column<TableRoom>[] = [
    {
      header: "ROOM NUMBER",
      accessor: (room: TableRoom) => (
        <div className="flex items-center justify-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100">
            <BedDouble size={16} className="text-blue-600" />
          </div>
          <span className="font-mono font-bold text-gray-900">
            {room.roomCode ?? room.roomNumber ?? "—"}
          </span>
        </div>
      ),
      align: "center",
    },
    {
      header: "ROOM TYPE",
      accessor: (room: TableRoom) => (
        <span className="font-semibold text-gray-700">{room.type}</span>
      ),
      align: "center"
    },
    {
      header: "STATUS",
      accessor: (room: TableRoom) => (
        <span
          className={`px-4 py-1.5 text-xs font-bold rounded-full min-w-[110px] inline-block shadow-sm ${getStatusBadgeClasses(
            room.status
          )}`}
        >
          {room.status}
        </span>
      ),
      align: "center",
    },
    {
      header: "CURRENT GUEST",
      accessor: (room: TableRoom) => {
        const key = getRoomKey(room);
        const customer = key ? guestInfoMap.get(key) : undefined;

        if (room.status === RoomStatus.Occupied && customer) {
          return (
            <div
              onDoubleClick={() => handleGuestDoubleClick(customer)}
              className="cursor-pointer font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
              title="Double-click to view customer"
            >
              {customer.fullName}
            </div>
          );
        }
        return <span className="text-gray-400">—</span>;
      },
      align: "center",
    },
  ];

  const activeRoomCustomer = activeRoom ? guestInfoMap.get(getRoomKey(activeRoom)) : undefined;
  const currentGuest = activeRoomCustomer?.fullName;
  const checkOutDateForModal = (activeRoomCustomer as any)?.checkOutDate;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg shadow-blue-500/30">
              <Home size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Room Management
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage and monitor all hotel rooms</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Filters Section */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Search */}
                <div className="relative group">
                  <Search className="absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search by Room No..."
                    value={searchTerm}
                    onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
                    className="w-56 pl-10 pr-4 py-2.5 bg-white text-black border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                  />
                </div>

                {/* Floor Filter */}
                <div className="relative">
                  <Filter className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <select
                    value={floorFilter}
                    onChange={(e) => handleFilterChange(setFloorFilter, e.target.value)}
                    className="pl-9 pr-8 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-medium shadow-sm hover:border-blue-300 transition-all appearance-none cursor-pointer"
                  >
                    {floorOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Room Type Filter */}
                <div className="relative">
                  <BedDouble className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <select
                    value={roomTypeFilter}
                    onChange={(e) => handleFilterChange(setRoomTypeFilter, e.target.value)}
                    className="pl-9 pr-8 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-medium shadow-sm hover:border-blue-300 transition-all appearance-none cursor-pointer"
                  >
                    {roomTypeOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <Sparkles className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <select
                    value={statusFilter}
                    onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
                    className="pl-9 pr-8 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 font-medium shadow-sm hover:border-blue-300 transition-all appearance-none cursor-pointer"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Create Room Button */}
              <Button
                type="button"
                leftIcon={<PlusCircle size={18} />}
                onClick={() => setCreateModalOpen(true)}
                className="!bg-gradient-to-r !from-green-600 !to-emerald-600 hover:!from-green-700 hover:!to-emerald-700 !shadow-lg hover:!shadow-xl !transform hover:!scale-105 !transition-all !duration-200"
              >
                Create Room
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="p-6">
            <Table
              columns={columns}
              data={tableData}
              isScrollable={false}
              getRowClassName={(room) =>
                (room.roomCode ?? room.roomNumber) === highlightedRoomCode
                  ? "bg-gradient-to-r from-blue-100 to-purple-100 animate-pulse"
                  : "hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50/30 transition-all duration-200"
              }
              renderRowActions={(room) => (
                <div className="flex items-center justify-center gap-2">
                  {/* View */}
                  <button
                    type="button"
                    onClick={() => openViewRoom(room)}
                    title="View"
                    aria-label={`View room ${room.roomCode ?? room.roomNumber}`}
                    className="group flex items-center justify-center w-9 h-9 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-all duration-200 hover:scale-110"
                  >
                    <Eye size={18} className="group-hover:scale-110 transition-transform" />
                  </button>

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => openEditRoom(room)}
                    title="Edit"
                    aria-label={`Edit room ${room.roomCode ?? room.roomNumber}`}
                    className="group flex items-center justify-center w-9 h-9 text-gray-500 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-all duration-200 hover:scale-110"
                  >
                    <Pencil size={18} className="group-hover:scale-110 transition-transform" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => setRoomToDelete(room)}
                    title="Delete"
                    aria-label={`Delete room ${room.roomCode ?? room.roomNumber}`}
                    className="group flex items-center justify-center w-9 h-9 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all duration-200 hover:scale-110"
                  >
                    <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              )}
            />

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row justify-between items-center pt-6 mt-6 border-t-2 border-dashed border-gray-200 gap-4">
              <div className="text-sm font-medium text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
                Showing <span className="font-bold text-blue-600">{sortedRooms.length > 0 ? indexOfFirstEntry + 1 : 0}</span> to{" "}
                <span className="font-bold text-blue-600">{Math.min(indexOfLastEntry, sortedRooms.length)}</span> of{" "}
                <span className="font-bold text-blue-600">{sortedRooms.length}</span> entries
              </div>

              <nav aria-label="Pagination" className="flex items-center gap-1">
                <button
                  type="button"
                  className="p-2.5 rounded-lg hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 hover:text-blue-600 transition-all hover:scale-110"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  title="First page"
                >
                  <ChevronsLeft size={18} />
                </button>

                <button
                  type="button"
                  className="p-2.5 rounded-lg hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 hover:text-blue-600 transition-all hover:scale-110"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  title="Previous page"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="flex gap-1">
                  {renderPageNumbers()}
                </div>

                <button
                  type="button"
                  className="p-2.5 rounded-lg hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 hover:text-blue-600 transition-all hover:scale-110"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  title="Next page"
                >
                  <ChevronRight size={18} />
                </button>

                <button
                  type="button"
                  className="p-2.5 rounded-lg hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 hover:text-blue-600 transition-all hover:scale-110"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  title="Last page"
                >
                  <ChevronsRight size={18} />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Create Room Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        maxWidth="3xl"
        title={
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
              <PlusCircle size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Create New Room</h2>
              <p className="text-xs text-gray-500 mt-0.5">Add a new room to the system</p>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSaveRoom} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="block">
              <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <BedDouble size={16} className="text-blue-600" />
                Room Number
              </div>
              <input
                id="roomCode"
                name="roomCode"
                required
                placeholder="e.g. 101"
                value={newRoom.roomCode}
                onChange={(e) =>
                  setNewRoom((prev) => ({ ...prev, roomCode: e.target.value }))
                }
                className="w-full px-4 py-2.5 bg-white text-black border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </label>

            <label className="block">
              <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Home size={16} className="text-purple-600" />
                Floor
              </div>
              <input
                id="floor"
                name="floor"
                required
                placeholder="e.g. 1st Floor"
                value={newRoom.floor}
                onChange={(e) =>
                  setNewRoom((prev) => ({ ...prev, floor: e.target.value }))
                }
                className="w-full px-4 py-2.5 bg-white text-black border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="block">
              <div className="text-sm font-semibold text-gray-700 mb-2">Room Type</div>
              <select
                id="type"
                name="type"
                value={newRoom.type}
                onChange={(e) =>
                  setNewRoom((prev) => ({
                    ...prev,
                    type: e.target.value as RoomType,
                  }))
                }
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
              >
                {newRoomTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <div className="text-sm font-semibold text-gray-700 mb-2">Max Occupancy</div>
              <input
                id="maxOccupancy"
                name="maxOccupancy"
                type="number"
                min={1}
                value={newRoom.maxOccupancy}
                onChange={(e) =>
                  setNewRoom((prev) => ({
                    ...prev,
                    maxOccupancy: Number(e.target.value),
                  }))
                }
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </label>
          </div>

          <label className="block">
            <div className="text-sm font-semibold text-gray-700 mb-2">Status</div>
            <select
              id="status"
              name="status"
              value={newRoom.status}
              onChange={(e) =>
                setNewRoom((prev) => ({
                  ...prev,
                  status: e.target.value as RoomStatus,
                }))
              }
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
            >
              <option value={RoomStatus.Available}>Available</option>
              <option value={RoomStatus.Cleaning}>Cleaning</option>
              <option value={RoomStatus.Maintenance}>Maintenance</option>
            </select>
          </label>

       <label className="block">
  <div className="flex items-end justify-between mb-2">
    <div className="text-sm font-semibold text-gray-700">
      Room Description / Amenities
    </div>

    <div
      className={`text-xs font-semibold ${
        (newRoom.description?.length ?? 0) >= 500 ? "text-red-600" : "text-gray-500"
      }`}
    >
      {(newRoom.description?.length ?? 0)}/500
    </div>
  </div>

  <textarea
    id="description"
    name="description"
    value={newRoom.description}
    maxLength={500}
    onChange={(e) => {
      const next = e.target.value.slice(0, 500); // กันชัวร์ 2 ชั้น
      setNewRoom((prev) => ({ ...prev, description: next }));
    }}
    placeholder="e.g. King Bed, Ocean View, Mini-bar"
    rows={4}
    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl
               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
               transition-all resize-none"
  />

  {(newRoom.description?.length ?? 0) >= 500 && (
    <p className="mt-2 text-xs text-red-600 font-medium">
      จำกัดไม่เกิน 500 ตัวอักษร
    </p>
  )}
</label>



          <div className="flex justify-end pt-4 gap-3 border-t-2 border-dashed border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateModalOpen(false)}
              className="hover:!bg-gray-100 !transition-all"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="!bg-gradient-to-r !from-green-600 !to-emerald-600 hover:!from-green-700 hover:!to-emerald-700 !shadow-lg hover:!shadow-xl !transform hover:!scale-105 !transition-all"
            >
              Save Room
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!roomToDelete}
        onClose={() => setRoomToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        message={`Are you sure you want to delete Room ${(roomToDelete as any)?.roomCode ?? (roomToDelete as any)?.roomNumber ?? "—"
          }? This will permanently remove it from the system.`}
      />

      {/* Room Details Modal (View/Edit mode) */}
      <RoomDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        room={activeRoom}
        currentGuest={currentGuest}
        checkOutDate={checkOutDateForModal}
        onUpdateRoom={handleUpdateRoom}
        mode={modalMode}
      />
    </div>
  );
};

export default RoomManagement;
