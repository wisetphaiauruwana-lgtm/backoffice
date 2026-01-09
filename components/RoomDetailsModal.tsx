import React from 'react';
import Modal from './ui/Modal';
import { Room, RoomStatus, RoomType } from '../types';
import DoubleClickEditableField from './ui/DoubleClickEditableField';
import { roomsService } from "../services/rooms.service";

import { useData } from '../contexts/DataContext';

interface RoomDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    room: Room | null;
    currentGuest?: string;
    checkOutDate?: string;
    /**
     * onUpdateRoom: optimistic UI update (local)
     * signature: (roomId: string, field: keyof Room, value: any) => void
     */
    onUpdateRoom: (roomId: string, field: keyof Room, value: any) => void;
}

const DetailItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
        <dt className="text-sm font-medium leading-6 text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm leading-6 text-gray-800 sm:col-span-2 sm:mt-0">{children}</dd>
    </div>
);

const roomTypesOptions: RoomType[] = ['Standard', 'Superior', 'Deluxe', 'Connecting'];
const roomStatusOptions: RoomStatus[] = [RoomStatus.Available, RoomStatus.Occupied, RoomStatus.Cleaning, RoomStatus.Maintenance];

const getStatusBadgeClasses = (status: RoomStatus) => {
    const statusClasses: Record<string, string> = {
        [RoomStatus.Available]: "bg-green-100 text-green-800",
        [RoomStatus.Occupied]: "bg-red-100 text-red-800",
        [RoomStatus.Cleaning]: "bg-blue-100 text-blue-800",
        [RoomStatus.Maintenance]: "bg-gray-100 text-gray-800",
    };
    return statusClasses[status] ?? "bg-gray-100 text-gray-800";
};

/** Resolve room id from various possible fields */
const resolveRoomIdCandidate = (room: Partial<Room> | null): string => {
    if (!room) return '';
    const anyRoom = room as any;
    if (anyRoom.ID !== undefined && anyRoom.ID !== null) return String(anyRoom.ID);
    if (anyRoom.id !== undefined && anyRoom.id !== null) return String(anyRoom.id);
    if (anyRoom.roomNumber) return String(anyRoom.roomNumber);
    return '';
};

const RoomDetailsModal: React.FC<RoomDetailsModalProps> = ({ isOpen, onClose, room, currentGuest, checkOutDate, onUpdateRoom }) => {
    if (!room) return null;

    const { setRooms } = useData(); // เพื่อให้เราดึงข้อมูลจริงจาก DB และอัปเดต context

    /**
     * handleFieldSave
     * - optimistic update via onUpdateRoom
     * - try to resolve numeric id (directly or by fetching rooms)
     * - call apiService.updateRoom(id, partial)
     * - on success: refresh rooms from server and update DataContext
     * - on failure: rollback UI change (call onUpdateRoom with previous value) and alert
     */
    const handleFieldSave = async (field: keyof Room, rawVal: any) => {
        const prevValue = (room as any)[field];
        let value = rawVal;

        if (field === 'maxOccupancy') {
            value = Number(rawVal);
            if (Number.isNaN(value)) value = 0;
        }

        // 1) Optimistic update locally
        try {
            const idCandidate = resolveRoomIdCandidate(room);
            onUpdateRoom(idCandidate, field, value);
        } catch (err) {
            console.warn('onUpdateRoom threw:', err);
        }

        // 2) Resolve numeric id to call backend
        let idCandidate = resolveRoomIdCandidate(room);
        let numericId = Number(idCandidate);
        if (Number.isNaN(numericId) || numericId <= 0) {
            // Try to find room record from backend by roomCode
            try {
               const allRooms = await roomsService.fetchAll();

                const found = allRooms.find(r =>
                    String(r.roomCode) === String(room.roomCode)
                );

                if (found) {
                    // cast once to any to avoid repetitive TS complaints
                    const anyFound = found as any;

                    // prefer anyFound.ID, then anyFound.id, then anyFound.roomNumber / roomCode fallback
                    // use ?? to handle undefined/null, then coerce to Number and guard NaN
                    const rawId = anyFound.ID ?? anyFound.id ?? anyFound.roomNumber ?? anyFound.roomCode ?? undefined;
                    const numericId = rawId !== undefined ? Number(rawId) : NaN;

                    if (!Number.isNaN(numericId) && numericId > 0) {
                        // we have a usable numeric id
                        // ... use numericId ...
                    } else {
                        // couldn't resolve numeric id
                        // decide: maybe call update by roomCode, or notify user
                        console.warn('Found room but could not resolve numeric ID:', found);
                    }
                }
            } catch (err) {
                console.warn("Couldn't fetch rooms to resolve ID:", err);
            }

        }

        // 3) If we have a valid numeric id, persist partial update
        if (!Number.isNaN(numericId) && numericId > 0) {
            try {
                const payload: Partial<Room> = { [field]: value } as Partial<Room>;
                await roomsService.update(numericId, payload);


                // 4) Refresh rooms from server to make sure DataContext reflects DB
                try {
                    const updatedRooms = await roomsService.fetchAll();
setRooms(updatedRooms);
                } catch (fetchErr) {
                    console.warn("Updated but failed to refresh local rooms:", fetchErr);
                    // It's okay — UI already optimistic updated — but recommend user to refresh manual if needed
                }
            } catch (err: any) {
                console.error("Failed to persist room update:", err);
                // rollback UI
                try {
                    const idCandidate = resolveRoomIdCandidate(room);
                    onUpdateRoom(idCandidate, field, prevValue);
                } catch (rollbackErr) {
                    console.warn("Rollback onUpdateRoom failed:", rollbackErr);
                }
                alert(`ไม่สามารถบันทึกไปยังเซิร์ฟเวอร์ได้: ${err?.message || 'Unknown error'}. การเปลี่ยนแปลงถูกย้อนกลับแล้ว`);
            }
        } else {
            // If we couldn't resolve an ID, inform user (but keep optimistic UI)
            console.warn("No numeric room id available to persist change. Kept change locally only.", idCandidate);
            alert("การเปลี่ยนแปลงถูกบันทึกเฉพาะฝั่งเครื่องนี้เท่านั้น — เซิร์ฟเวอร์ยังไม่ได้อัปเดตเพราะไม่พบ room id. กรุณาตรวจสอบว่าข้อมูลห้องมี ID ในระบบหรือรีเฟรชหน้า");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Room Details: ${room.roomCode}`}>
            <div>
                <div className="border-t border-gray-200">
                    <dl className="divide-y divide-gray-200">
                        <DetailItem label="Room Number">
                            <DoubleClickEditableField
                                label="Room Number"
                                type="text"
                                initialValue={room.roomCode}
                                onSave={(val) => handleFieldSave('roomCode', val)}
                            />
                        </DetailItem>

                        <DetailItem label="Room Type">
                            <DoubleClickEditableField
                                label="Room Type"
                                type="select"
                                initialValue={room.type}
                                options={roomTypesOptions}
                                onSave={(val) => handleFieldSave('type', val)}
                            />
                        </DetailItem>

                        <DetailItem label="Status">
                            <DoubleClickEditableField
                                label="Status"
                                type="select"
                                initialValue={room.status}
                                options={roomStatusOptions}
                                onSave={(val) => handleFieldSave('status', val)}
                            >
                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClasses(room.status)}`}>
                                    {room.status}
                                </span>
                            </DoubleClickEditableField>
                        </DetailItem>

                        <DetailItem label="Max Occupancy">
                            <DoubleClickEditableField
                                label="Max Occupancy"
                                type="number"
                                initialValue={room.maxOccupancy}
                                onSave={(val) => handleFieldSave('maxOccupancy', Number(val))}
                            />
                        </DetailItem>

                        <DetailItem label="Room Description / Amenities">
                            <DoubleClickEditableField
                                label="Room Description / Amenities"
                                type="textarea"
                                initialValue={room.description || ''}
                                onSave={(val) => handleFieldSave('description', val)}
                            />
                        </DetailItem>

                        {room.status === RoomStatus.Occupied && (
                            <>
                                <div className="py-2 col-span-full">
                                    <h4 className="text-sm font-semibold text-blue-800 bg-blue-50 -mx-6 px-6 py-2 border-y">Guest Information</h4>
                                </div>
                                <DetailItem label="Current Guest">
                                    {currentGuest || '—'}
                                </DetailItem>
                                <DetailItem label="Check-Out Date">
                                    {checkOutDate || '—'}
                                </DetailItem>
                            </>
                        )}
                    </dl>
                </div>
            </div>
        </Modal>
    );
};

export default RoomDetailsModal;
