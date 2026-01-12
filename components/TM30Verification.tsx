
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Customer, Gender } from '../types';
import Button from './ui/Button';
import { Search, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Calendar, Printer, FileSpreadsheet } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import AccessDenied from './ui/AccessDenied';

// Represents a single guest row for the TM.30 Excel format
interface TM30ExcelGuest {
    id: string; // bookingId-passportId
    firstName: string;
    middleName: string;
    lastName: string;
    gender: string;
    passportId: string;
    nationality: string; // ISO 3166-1 alpha-3 code
    dob: string; // Formatted DD/MM/YYYY
    checkOutDate: string; // Formatted DD/MM/YYYY
    phone: string;
}

const nationalityToISO: { [key: string]: string } = {
    'American': 'USA',
    'British': 'GBR',
    'Canadian': 'CAN',
    'Australian': 'AUS',
    'German': 'DEU',
    'French': 'FRA',
    'Japanese': 'JPN',
    'Chinese': 'CHN',
};

const getNationalityCode = (nationality: string): string => {
    return nationalityToISO[nationality] || nationality.substring(0, 3).toUpperCase();
};

const getGenderCode = (gender: Gender): string => {
    if (gender === 'Male') return 'M';
    if (gender === 'Female') return 'F';
    return 'F'; // Default 'Other' to 'F' as per M/F only requirement.
};


const TM30Verification: React.FC = () => {
    const { customers } = useData();
    const { can } = usePermissions();
    const canView = can('tm30Verification', 'view');
    const canSubmit = can('tm30Verification', 'submit');
    const canExport = can('tm30Verification', 'export');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [entriesPerPage, setEntriesPerPage] = useState(10);

    // Helper to parse full name into parts
    const parseName = (fullName: string) => {
        const parts = fullName.trim().split(' ').filter(p => p);
        if (parts.length === 0) return { firstName: '', middleName: '', lastName: '' };
        if (parts.length === 1) return { firstName: parts[0], middleName: '', lastName: '' };
        if (parts.length === 2) return { firstName: parts[0], middleName: '', lastName: parts[1] };
        return {
            firstName: parts[0],
            middleName: parts.slice(1, -1).join(' '),
            lastName: parts[parts.length - 1],
        };
    };

    // Helper to format YYYY-MM-DD to DD/MM/YYYY
    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const [y, m, d] = dateString.split('-');
        return `${d}/${m}/${y}`;
    };

    // Data Logic: Flatten all customers and guests into the Excel format
    const filteredData = useMemo(() => {
    const startDate = dateRange.start ? new Date(dateRange.start) : null;
    const endDate = dateRange.end ? new Date(dateRange.end) : null;
    if (startDate) startDate.setHours(0,0,0,0);
    if (endDate) endDate.setHours(23,59,59,999);

    const relevantCustomers = customers.filter(c => {
        if (!c.checkOutDate) return false;
        const checkOutDate = new Date(c.checkOutDate);
        return (!startDate || checkOutDate >= startDate) &&
               (!endDate || checkOutDate <= endDate);
    });

    const allGuests: TM30ExcelGuest[] = [];

    relevantCustomers.forEach(customer => {
        const mainBookerName = parseName(customer.fullName);

        allGuests.push({
            id: `${customer.bookingId}-${customer.passportId}`,
            firstName: mainBookerName.firstName,
            middleName: mainBookerName.middleName,
            lastName: mainBookerName.lastName,
            gender: getGenderCode(customer.gender),
            passportId: customer.passportId,
            nationality: getNationalityCode(customer.nationality),
            dob: formatDate(customer.dob),
            checkOutDate: formatDate(customer.checkOutDate),
            phone: customer.phone,
        });

        (customer.guestList ?? []).forEach(guest => {
            const guestName = parseName(guest.name);
            allGuests.push({
                id: `${customer.bookingId}-${guest.passportId}`,
                firstName: guestName.firstName,
                middleName: guestName.middleName,
                lastName: guestName.lastName,
                gender: getGenderCode(guest.gender),
                passportId: guest.passportId,
                nationality: getNationalityCode(guest.nationality),
                dob: formatDate(guest.dob),
                checkOutDate: formatDate(customer.checkOutDate),
                phone: guest.phone,
            });
        });
    });

    if (!searchTerm) return allGuests;

    const q = searchTerm.toLowerCase();
    return allGuests.filter(g =>
        g.firstName.toLowerCase().includes(q) ||
        g.lastName.toLowerCase().includes(q) ||
        g.passportId.toLowerCase().includes(q)
    );
}, [customers, searchTerm, dateRange]);


    const indexOfLastEntry = currentPage * entriesPerPage;
    const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
    const currentEntries = filteredData.slice(indexOfFirstEntry, indexOfLastEntry);
    const totalPages = Math.ceil(filteredData.length / entriesPerPage);

    const handlePageChange = (pageNumber: number) => {
        if (pageNumber > 0 && pageNumber <= totalPages) {
            setCurrentPage(pageNumber);
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
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200 ${currentPage === i ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    {i}
                </button>
            );
        }
        return pageNumbers;
    };

    if (!canView) {
        return <AccessDenied message="You do not have permission to view TM.30 verification." />;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">TM.30 Verification (บัญชีรายชื่อคนต่างด้าว)</h1>

            <div className="bg-white p-6 rounded-xl shadow-sm">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                    {/* Left Side */}
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by Guest Name or Passport..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="w-64 pl-10 pr-4 py-2 bg-white text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>Show</span>
                            <select
                                value={entriesPerPage}
                                onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
                                aria-label="Entries per page"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                            <span>entries</span>
                        </div>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 border border-gray-300 rounded-lg px-2 py-1.5 focus-within:ring-1 focus-within:ring-blue-500 bg-white">
                            <Calendar size={16} className="text-gray-600" />
                            <input
                                type="date"
                                aria-label="Start Date"
                                value={dateRange.start}
                                onChange={(e) => { setDateRange({ ...dateRange, start: e.target.value }); setCurrentPage(1); }}
                                className="text-sm bg-white text-black focus:outline-none placeholder-gray-500"
                            />
                        </div>
                        <span className="text-gray-500 text-sm">to</span>
                        <div className="flex items-center gap-1 border border-gray-300 rounded-lg px-2 py-1.5 focus-within:ring-1 focus-within:ring-blue-500 bg-white">
                            <Calendar size={16} className="text-gray-600" />
                            <input
                                type="date"
                                aria-label="End Date"
                                value={dateRange.end}
                                onChange={(e) => { setDateRange({ ...dateRange, end: e.target.value }); setCurrentPage(1); }}
                                className="text-sm bg-white text-black focus:outline-none placeholder-gray-500"
                            />
                        </div>
                        <Button variant="primary" disabled={!canSubmit}>Generate Report</Button>
                        <Button className="!bg-green-600 hover:!bg-green-700 focus:!ring-green-500" leftIcon={<FileSpreadsheet size={16} />} disabled={!canExport}>Export to Excel</Button>
                        <Button variant="secondary" leftIcon={<Printer size={16} />} onClick={() => window.print()} disabled={!canExport}>Print / Export PDF</Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border-collapse border border-black">
                        <thead>
                            <tr className="bg-gray-100 text-black">
                                <th className="border border-black p-2 text-left font-bold">ชื่อ (First Name)</th>
                                <th className="border border-black p-2 text-left font-bold">ชื่อกลาง (Middle Name)</th>
                                <th className="border border-black p-2 text-left font-bold">นามสกุล (Last Name)</th>
                                <th className="border border-black p-2 text-left font-bold">เพศ (Gender)</th>
                                <th className="border border-black p-2 text-left font-bold">เลขหนังสือเดินทาง (Passport No.)</th>
                                <th className="border border-black p-2 text-left font-bold">สัญชาติ (Nationality)</th>
                                <th className="border border-black p-2 text-center font-bold">วัน เดือน ปี เกิด (Birth Date)</th>
                                <th className="border border-black p-2 text-center font-bold">วันที่แจ้งออกจากที่พัก (Check-out Date)</th>
                                <th className="border border-black p-2 text-left font-bold">เบอร์โทรศัพท์ (Phone No.)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white text-black">
                            {currentEntries.map((guest) => (
                                <tr key={guest.id}>
                                    <td className="border border-black p-2 text-left">{guest.firstName}</td>
                                    <td className="border border-black p-2 text-left">{guest.middleName || '-'}</td>
                                    <td className="border border-black p-2 text-left">{guest.lastName}</td>
                                    <td className="border border-black p-2 text-left">{guest.gender}</td>
                                    <td className="border border-black p-2 text-left">{guest.passportId}</td>
                                    <td className="border border-black p-2 text-left">{guest.nationality}</td>
                                    <td className="border border-black p-2 text-center">{guest.dob}</td>
                                    <td className="border border-black p-2 text-center">{guest.checkOutDate}</td>
                                    <td className="border border-black p-2 text-left">{guest.phone}</td>
                                </tr>
                            ))}
                            {currentEntries.length === 0 && (
                                <tr><td colSpan={9} className="text-center p-4 border border-black">No data found for the selected criteria.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center pt-4 mt-4 border-t border-gray-200 gap-4">
                    <div className="text-sm text-gray-600">
                        Showing {filteredData.length > 0 ? indexOfFirstEntry + 1 : 0} to {Math.min(indexOfLastEntry, filteredData.length)} of {filteredData.length} entries
                    </div>

                    <nav aria-label="Pagination" className="flex items-center space-x-1">
                        <button onClick={() => handlePageChange(1)} disabled={currentPage === 1} className="p-2 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" title="First Page">
                            <ChevronsLeft size={16} />
                        </button>
                        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" title="Previous Page">
                            <ChevronLeft size={16} />
                        </button>

                        {renderPageNumbers()}

                        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="p-2 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" title="Next Page">
                            <ChevronRight size={16} />
                        </button>
                        <button onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="p-2 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" title="Last Page">
                            <ChevronsRight size={16} />
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
};

export default TM30Verification;
