// src/types.ts

// --- Room Management Enums and Interfaces ---

export enum RoomStatus {
  Available = 'Available',
  Occupied = 'Occupied',
  Cleaning = 'Cleaning',
  Maintenance = 'Maintenance',
}

export type RoomType = 'Standard' | 'Superior' | 'Deluxe' | 'Connecting';

/**
 * Room interface aligned with backend JSON:
 * - backend may return "ID" (number) or "id"
 * - backend may use snake_case or camelCase for some fields
 * To be tolerant on the frontend we include common variants as optional fields.
 */
export interface Room {
  // Backend may use ID or id. Keep both optional to support pre-save objects and various backend shapes.
  ID?: number | string;
  id?: number | string;

  // Common identifiers (support multiple naming variants)
  roomCode: string;         // canonical used in UI, e.g. "123v55"
  roomNumber?: string;      // camelCase variant
  room_number?: string;     // snake_case variant (backend)
  accessCode?: string;      // 6-digit room access code

  // Basic attributes
  floor: string;
  type: RoomType | string;  // backend may send free-text
  bedType?: string;
  price: number;
  status: RoomStatus;
  maxOccupancy: number;
  description: string;

  // room type id (support both naming styles)
  RoomTypeID?: number;
  RoomTypeId?: number;
  roomTypeID?: number;
  room_type_id?: number;

  // optional backend associations (keep variant keys tolerant)
  RoomType?: {
    id: number;
    type_name: string;
    description: string;
    max_guests: number;
    CreatedAt?: string;
    DeletedAt?: string | null;
  };

  // optional additional ids/aliases
  roomId?: number;
  numericId?: number;
  floorAndview?: string;
  internalNotes?: string;
  // any other backend-provided fields we might access:
  [key: string]: any;
}


// --- General Booking and Guest Types ---

export type EmailStatus = 'Sent' | 'Not Sent' | 'Pending';
export type Gender = 'Male' | 'Female' | 'Other';
export type GuestType = 'Adult' | 'Child' | 'Infant';

export enum BookingStatus {
  Confirmed = 'Confirmed',
  Pending = 'Pending',
  CheckedIn = 'Checked-In',
  CheckedOut = 'Checked-Out',
  Cancelled = 'Cancelled',
}

export interface RoomStay {
  // Keep both variants so mapping from backend to frontend (guest.roomStays vs. your code) works consistently
  roomNumber: string;
  room_number?: string;
  bookingStatus: BookingStatus;
}


// --- Immigration and TM30 Types ---

export type VisaType =
  | 'Visa Exemption (ยกเว้นวีซ่า)'
  | 'Visa on Arrival (VOA)'
  | 'Tourist Visa (TR)'
  | 'Non-Immigrant (NON-B)'
  | 'Non-Immigrant (NON-ED)'
  | 'Non-Immigrant (NON-O)'
  | 'Non-Immigrant (NON-O-A)'
  | 'LTR Visa'
  | 'SMART Visa'
  | 'อื่นๆ (Others)';

export type PortOfEntry = string;

export enum TM30Status {
  Pending = 'Pending Submission',
  Submitted = 'Submitted',
  Acknowledged = 'Acknowledged',
}


// --- Guest Interface ---
export interface GuestDetails {
  firstName?: string;
  lastName?: string;
  documentNumber?: string;
  nationality?: string;
  gender?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  currentAddress?: string;
}

// ============================
// ✅ GUEST (ใช้ใน Check-in / GuestListScreen)
// ============================
export interface Guest {
  id: string | number;
  bookingId?: number | string;

  name: string;
  isMainGuest: boolean;
  progress: number;

  documentType?: DocumentType;
  idType?: string;
  idNumber?: string;

  faceImage?: string;
  documentImage?: string;

  details?: GuestDetails;
}

// --- Customer Interface ---

// --- Customer Interface ---

export interface Customer {
  id?: string | number; // Primary Key (uint in Go)
  bookingId: string;
  fullName: string;

  nationality: string;
  passportId: string;
  dob: string;
  phone: string;
  email: string;
  guestType: GuestType;
  currentAddress: string;
  checkInDate: string;
  checkOutDate: string;
  roomStays: RoomStay[];

  emailStatus: EmailStatus;
  adults: number;
  children: number;
  guestList: Guest[];
  gender: Gender;
// ⭐ เพิ่มตรงนี้
  idType?: string;
  idNumber?: string;
  visaType: VisaType;
  expireDateOfStay: string;
  portOfEntry: PortOfEntry;
  arrivalCardNumber: string;
  relationship: string;
  tm30Status: TM30Status;
  occupation: string;
  arrivingFrom: string;
  goingTo: string;
  issuedBy: string;
  remarks: string;
}

/**
 * ✅ ใช้เฉพาะหน้า Customer List
 * เบา + ตรงความต้องการ UI
 */
export interface CustomerListItem {
  id: number;
  fullName: string;
  nationality: string;
  gender: Gender;
   // ⭐ เพิ่ม
  idType?: string;
  idNumber?: string;
}



export type Booking = Customer;


// --- Consent Interface (for Transaction 4) ---

export interface Consent {
  id: number; // ConsentID in backend
  slug: string;
  title: string;
  description: string;
  version: string;
  // ... possible additional fields (e.g. effectiveFrom)
}


// --- User and Permissions Management Enums and Interfaces ---

export type UserStatus = 'Active' | 'Pending Invite';

export type Role = 'owner' | 'Manager' | 'Receptionist' | 'Cleaner';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  lastLogin: string;
}

export interface PermissionActions {
  view: boolean;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
  editStatus?: boolean;
  submit?: boolean;
  verify?: boolean;
  export?: boolean;
  send?: boolean;
  config?: boolean;
  reset?: boolean;
}

export interface RolePermissions {
  bookingManagement: PermissionActions;
  roomManagement: PermissionActions;
  customerList: PermissionActions;
  tm30Verification: PermissionActions;
  rolesAndPermissions: PermissionActions;
  emailManagement: PermissionActions;
  roomAccess: PermissionActions;
  auditLogs: PermissionActions;
}

export interface RoleDetails {
  id: string;
  name: Role;
  description: string;
  members: User[];
  permissions: RolePermissions;
}

export enum ApprovalStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

export interface PendingApproval {
  id: string;
  userName: string;
  requestedRole: Role;
  dateApplied: string;
  status: ApprovalStatus;
}

export type SettingsCategory = 'general' | 'users' | 'email' | 'security';
