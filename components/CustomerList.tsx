import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import Table from "./ui/Table";

import { Customer, CustomerListItem } from "../types";
import type { Column } from "./ui/Table";

import ConfirmationModal from "./ui/ConfirmationModal";
import CustomerDetailsModal from "./CustomerDetailsModal";
import AccessDenied from "./ui/AccessDenied";
import {
  Eye,
  Pencil, // ✅ ADD
  Trash2,
  Search,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Users,
  Filter,
  X,
} from "lucide-react";
import { guestsService } from "../services/guests.service";
import { usePermissions } from "../hooks/usePermissions";

const CustomerList: React.FC = () => {
  const { can } = usePermissions();
  const canView = can("customerList", "view");
  const canEdit = can("customerList", "edit");
  const canDelete = can("customerList", "delete");
  const denyView = !canView;
  const [allGuests, setAllGuests] = useState<CustomerListItem[]>([]);
  const [guests, setGuests] = useState<CustomerListItem[]>([]);

  const navigate = useNavigate();
  const location = useLocation();

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerListItem | null>(null);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");

  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // ✅ added: loading + error (ช่วย debug ว่าดึงได้จริงไหม)
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ✅ กัน useEffect ยิงซ้ำใน React 18 StrictMode (dev)
  const didLoadRef = useRef(false);

  const filteredCustomers = useMemo(() => {
    const text = searchTerm.toLowerCase();

    return guests.filter((g) =>
      (g.fullName ?? "").toLowerCase().includes(text) ||
      (g.nationality ?? "").toLowerCase().includes(text) ||
      (g.idNumber ?? "").toLowerCase().includes(text)
    );
  }, [guests, searchTerm]);

  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredCustomers.slice(indexOfFirstEntry, indexOfLastEntry);
  const totalPages = Math.ceil(filteredCustomers.length / entriesPerPage);

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleFilterChange = (
    setter: React.Dispatch<React.SetStateAction<any>>,
    value: any
  ) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleRoomDoubleClick = (roomNumber: string) => {
    const firstRoom = roomNumber.split(", ")[0];
    if (firstRoom && firstRoom !== "—") {
      navigate("/rooms", { state: { highlight: firstRoom } });
    }
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
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
          onClick={() => handlePageChange(i)}
          className={`min-w-[36px] h-9 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${
            currentPage === i
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          {i}
        </button>
      );
    }
    return pageNumbers;
  };

  const openViewCustomer = async (customer: CustomerListItem) => {
  try {
    const detail = await guestsService.getById(customer.id);
    setActiveCustomer(detail);
    setModalMode("view");
    setIsModalOpen(true);
  } catch (e: any) {
    console.error("[CustomerList] getById failed:", e);
    const msg =
      e?.body?.message ||
      e?.body?.error ||
      (typeof e?.body === "string" ? e.body : null) ||
      e?.message ||
      "Failed to load customer details";
    alert(msg);
  }
};

const openEditCustomer = async (customer: CustomerListItem) => {
  if (!canEdit) return;
  try {
    const detail = await guestsService.getById(customer.id);
    setActiveCustomer(detail);
    setModalMode("edit");
    setIsModalOpen(true);
  } catch (e: any) {
    console.error("[CustomerList] getById failed:", e);
    const msg =
      e?.body?.message ||
      e?.body?.error ||
      (typeof e?.body === "string" ? e.body : null) ||
      e?.message ||
      "Failed to load customer details";
    alert(msg);
  }
};

  const handleUpdateCustomer = async (updated: Customer) => {
    if (!canEdit) return;
    try {
      await guestsService.update(updated.id!, updated);

      setGuests((prev) =>
        prev.map((g) =>
          g.id === updated.id
            ? {
                id: updated.id as number,
                fullName: updated.fullName,
                nationality: updated.nationality,
                gender: updated.gender,
                idType:
                  (updated as any).idType ??
                  (updated as any).id_type ??
                  g.idType ??
                  null,
                idNumber:
                  (updated as any).idNumber ??
                  (updated as any).id_number ??
                  g.idNumber ??
                  null,
              }
            : g
        )
      );

      setActiveCustomer(updated);
    } catch (err: any) {
      console.error("Update guest failed:", err);
      const msg =
        err?.body?.message ||
        err?.body?.error ||
        (typeof err?.body === "string" ? err.body : null) ||
        err?.message ||
        "Failed to update customer";
      alert(msg);
    }
  };

  useEffect(() => {
    // ✅ กันยิงซ้ำใน dev
    if (didLoadRef.current) return;
    didLoadRef.current = true;

    const loadGuests = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        const data = await guestsService.fetchAll();

        // ✅ map field names รองรับ snake_case + PascalCase + camelCase
        const normalized: CustomerListItem[] = (data || []).map((g: any) => ({
          id: Number(g.id ?? g.ID ?? 0),
          fullName: (g.fullName ?? g.full_name ?? g.FullName ?? "").toString(),
          nationality: (g.nationality ?? g.Nationality ?? "—").toString(),
          gender: (g.gender ?? g.Gender ?? "—").toString(),
          idType: (g.idType ?? g.id_type ?? g.IDType ?? null) as any,
          idNumber: (g.idNumber ?? g.id_number ?? g.IDNumber ?? null) as any,
        }));

        setAllGuests(normalized);

        const flag = (location.state as any)?.filter;

        if (flag === "missing-registration") {
          setActiveFilter("missing-registration");
          setGuests(normalized.filter((g) => !g.idNumber || !g.idType));
        } else {
          setActiveFilter(null);
          setGuests(normalized);
        }

        setCurrentPage(1);
      } catch (e: any) {
        console.error("[CustomerList] loadGuests failed:", e);

        const bodyMsg =
          e?.body?.message ||
          e?.body?.error ||
          (typeof e?.body === "string" ? e.body : null);

        const pretty =
          bodyMsg ||
          (e?.body ? JSON.stringify(e.body) : null) ||
          e?.message ||
          "Load guests failed";

        setLoadError(pretty);
        setAllGuests([]);
        setGuests([]);
      } finally {
        setLoading(false);
      }
    };

    loadGuests();
  }, [location.state]);

  const handleConfirmDelete = async () => {
    if (!canDelete) return;
    if (!customerToDelete) return;

    try {
      await guestsService.remove(customerToDelete.id);
      setGuests((prev) => prev.filter((g) => g.id !== customerToDelete.id));
      setAllGuests((prev) => prev.filter((g) => g.id !== customerToDelete.id));
    } catch (err: any) {
      console.error("Delete guest failed:", err);
      const msg =
        err?.body?.message ||
        err?.body?.error ||
        (typeof err?.body === "string" ? err.body : null) ||
        err?.message ||
        "Delete failed";
      alert(msg);
    } finally {
      setCustomerToDelete(null);
    }
  };

  const clearFilter = () => {
    setActiveFilter(null);
    setGuests(allGuests);
    setCurrentPage(1);
  };

  const columns: Column<CustomerListItem>[] = [
    { header: "Guest Name", accessor: "fullName", align: "left" },
    { header: "Nationality", accessor: "nationality" },
    { header: "Gender", accessor: "gender" },
    { header: "ID Type", accessor: (c) => c.idType?.replace("_", " ") || "—" },
    { header: "ID Number", accessor: (c) => c.idNumber || "—" },
  ];

  const getRowClassName = () => "";

  if (denyView) {
    return <AccessDenied message="You do not have permission to view customers." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Customer List
            </h1>
            <p className="text-gray-600 mt-2">Manage your guests and customer information</p>
          </div>

          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow-sm border border-gray-100">
            <Users size={20} className="text-purple-600" />
            <div>
              <div className="text-sm text-gray-500">Total Guests</div>
              <div className="text-2xl font-bold text-gray-800">{filteredCustomers.length}</div>
            </div>
          </div>
        </div>

        {/* Active Filter Badge */}
        {activeFilter && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl">
            <Filter size={18} className="text-amber-600" />
            <span className="text-sm font-medium text-amber-800">
              Showing guests with missing registration data
            </span>
            <button
              onClick={clearFilter}
              className="ml-auto p-1 hover:bg-amber-100 rounded-lg transition-colors"
            >
              <X size={16} className="text-amber-600" />
            </button>
          </div>
        )}

        {/* Main Content Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Search and Filters Section */}
          <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative w-full md:w-auto">
                <Search className="absolute top-1/2 left-4 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, nationality, or ID number..."
                  value={searchTerm}
                  onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
                  className="w-full md:w-96 pl-12 pr-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm transition-all duration-200"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-600">Show</label>
                <select
                  value={entriesPerPage}
                  onChange={(e) => {
                    setEntriesPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-700 font-medium"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-600">entries</span>
              </div>
            </div>
          </div>

          {/* Loading / Error */}
          {loading && <div className="p-6 text-gray-500">Loading guests...</div>}
          {loadError && <div className="p-6 text-red-600">{loadError}</div>}

          {/* Table Section */}
          {!loading && !loadError && (
            <div className="p-6">
              <Table<CustomerListItem>
                columns={columns}
                data={currentEntries}
                isScrollable={false}
                getRowClassName={getRowClassName}
                renderRowActions={(customer) => (
  <div className="flex items-center justify-end gap-2">
    {/* View */}
    <button
      onClick={() => openViewCustomer(customer)}
      title="View"
      aria-label={`View ${customer.fullName}`}
      className="group flex items-center justify-center w-9 h-9 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-all duration-200 hover:scale-110"
    >
      <Eye size={18} className="group-hover:scale-110 transition-transform" />
    </button>

    {/* Edit */}
    {canEdit && (
      <button
        onClick={() => openEditCustomer(customer)}
        title="Edit"
        aria-label={`Edit ${customer.fullName}`}
        className="group flex items-center justify-center w-9 h-9 text-gray-500 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-all duration-200 hover:scale-110"
      >
        <Pencil size={18} className="group-hover:scale-110 transition-transform" />
      </button>
    )}

    {/* Delete */}
    {canDelete && (
      <button
        onClick={() => setCustomerToDelete(customer)}
        title="Delete"
        aria-label={`Delete ${customer.fullName}`}
        className="group flex items-center justify-center w-9 h-9 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all duration-200 hover:scale-110"
      >
        <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
      </button>
    )}
  </div>
)}

              />
            </div>
          )}

          {/* Pagination Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-600 font-medium">
                Showing{" "}
                <span className="text-gray-900 font-semibold">
                  {filteredCustomers.length > 0 ? indexOfFirstEntry + 1 : 0}
                </span>{" "}
                to{" "}
                <span className="text-gray-900 font-semibold">
                  {Math.min(indexOfLastEntry, filteredCustomers.length)}
                </span>{" "}
                of{" "}
                <span className="text-gray-900 font-semibold">{filteredCustomers.length}</span>{" "}
                entries
              </div>

              <nav aria-label="Pagination" className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all duration-200"
                  title="First Page"
                >
                  <ChevronsLeft size={18} />
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all duration-200"
                  title="Previous Page"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="flex gap-1 mx-2">{renderPageNumbers()}</div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all duration-200"
                  title="Next Page"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-all duration-200"
                  title="Last Page"
                >
                  <ChevronsRight size={18} />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ConfirmationModal
        isOpen={!!customerToDelete}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        message={`Are you sure you want to delete ${customerToDelete?.fullName}? All their bookings will be permanently removed.`}
      />

      <CustomerDetailsModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  mode={modalMode} // ✅ ADD
  customerProfile={activeCustomer ? { latestCustomerRecord: activeCustomer } : null}
  onUpdateCustomer={handleUpdateCustomer}
  allCustomers={guests}
/>

    </div>
  );
};

export default CustomerList;
