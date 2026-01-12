import React, { useEffect, useMemo, useState } from 'react';
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
    mode?: "view" | "edit";
    canEdit?: boolean;
    canEditStatus?: boolean;
    /**
     * onUpdateRoom: optimistic UI update (local)
     * signature: (roomId: string, field: keyof Room, value: any) => void
     */
    onUpdateRoom: (roomId: string, field: keyof Room, value: any) => void;
}

const DetailItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</dt>
        <dd className="mt-2 text-sm text-gray-900">{children}</dd>
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
    if (anyRoom.roomCode) return String(anyRoom.roomCode);
    return '';
};

const RoomDetailsModal: React.FC<RoomDetailsModalProps> = ({
    isOpen,
    onClose,
    room,
    currentGuest,
    checkOutDate,
    onUpdateRoom,
    mode = "view",
    canEdit = false,
    canEditStatus = false,
}) => {
    const { setRooms } = useData(); // เพื่อให้เราดึงข้อมูลจริงจาก DB และอัปเดต context
    if (!room) return null;

    /**
     * handleFieldSave
     * - optimistic update via onUpdateRoom
     * - try to resolve numeric id (directly or by fetching rooms)
     * - call apiService.updateRoom(id, partial)
     * - on success: refresh rooms from server and update DataContext
     * - on failure: rollback UI change (call onUpdateRoom with previous value) and alert
     */
    const handleFieldSave = async (field: keyof Room, rawVal: any) => {
        if (field === "status" && !canEditStatus) return;
        if (field !== "status" && !canEdit) return;
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
                const roomKey = String(room.roomCode ?? room.roomNumber ?? '').trim().toLowerCase();

                const found = allRooms.find((r: any) => {
                    const candidate = String(r?.roomCode ?? r?.roomNumber ?? '').trim().toLowerCase();
                    return candidate === roomKey && roomKey !== '';
                });

                if (found) {
                    // cast once to any to avoid repetitive TS complaints
                    const anyFound = found as any;

                    // prefer anyFound.ID, then anyFound.id, then anyFound.roomNumber / roomCode fallback
                    // use ?? to handle undefined/null, then coerce to Number and guard NaN
                    const rawId =
                        anyFound.ID ??
                        anyFound.id ??
                        anyFound.roomId ??
                        anyFound.numericId ??
                        anyFound.roomNumber ??
                        anyFound.roomCode ??
                        undefined;
                    const resolvedId = rawId !== undefined ? Number(rawId) : NaN;

                    if (!Number.isNaN(resolvedId) && resolvedId > 0) {
                        numericId = resolvedId;
                        idCandidate = String(rawId);
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

    const roomCode = room.roomCode ?? room.roomNumber ?? "—";
    const isEditable = mode === "edit" && (canEdit || canEditStatus);
    const [editValues, setEditValues] = useState<Partial<Room>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!room) return;
        setEditValues({
            roomCode: room.roomCode ?? room.roomNumber ?? "",
            type: room.type,
            status: room.status,
            maxOccupancy: room.maxOccupancy,
            description: room.description ?? "",
        });
    }, [room]);

    const hasChanges = useMemo(() => {
        if (!room) return false;
        const current = {
            roomCode: room.roomCode ?? room.roomNumber ?? "",
            type: room.type,
            status: room.status,
            maxOccupancy: room.maxOccupancy,
            description: room.description ?? "",
        };
        const canEditFields = canEdit;
        const canEditRoomStatus = canEditStatus;
        const changes: boolean[] = [];

        if (canEditFields) {
            changes.push(String(editValues.roomCode ?? "") !== String(current.roomCode ?? ""));
            changes.push(String(editValues.type ?? "") !== String(current.type ?? ""));
            changes.push(String(editValues.maxOccupancy ?? "") !== String(current.maxOccupancy ?? ""));
            changes.push(String(editValues.description ?? "") !== String(current.description ?? ""));
        }

        if (canEditRoomStatus) {
            changes.push(String(editValues.status ?? "") !== String(current.status ?? ""));
        }

        return (
            changes.some(Boolean)
        );
    }, [editValues, room, canEdit, canEditStatus]);

    const handleSaveAll = async () => {
        if (!room || !hasChanges || isSaving) return;
        setIsSaving(true);
        try {
            const updates: Array<[keyof Room, any]> = [];

            if (canEdit && (editValues.roomCode ?? "") !== (room.roomCode ?? room.roomNumber ?? "")) {
                updates.push(["roomCode", editValues.roomCode ?? ""]);
            }
            if (canEdit && editValues.type !== undefined && editValues.type !== room.type) {
                updates.push(["type", editValues.type]);
            }
            if (canEditStatus && editValues.status !== undefined && editValues.status !== room.status) {
                updates.push(["status", editValues.status]);
            }
            if (canEdit && editValues.maxOccupancy !== undefined && editValues.maxOccupancy !== room.maxOccupancy) {
                updates.push(["maxOccupancy", Number(editValues.maxOccupancy)]);
            }
            if (canEdit && (editValues.description ?? "") !== (room.description ?? "")) {
                updates.push(["description", editValues.description ?? ""]);
            }

            for (const [field, value] of updates) {
                await handleFieldSave(field, value);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const renderValue = (value: React.ReactNode) => (
        <div className="min-h-[36px] flex items-center">{value}</div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center justify-between gap-4 pr-6">
                    <div>
                        <div className="text-xs uppercase tracking-wider text-gray-400">Room</div>
                        <div className="text-lg font-semibold text-gray-900">{roomCode}</div>
                        <div className="mt-1 text-sm text-gray-500">{room.type ?? "—"}</div>
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClasses(room.status)}`}>
                        {room.status}
                    </span>
                </div>
            }
        >
            <div className="-mx-6 -mb-6 bg-gradient-to-br from-gray-50 to-white px-6 pb-8 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DetailItem label="Room Number">
                        {isEditable && canEdit ? (
                            <input
                                type="text"
                                value={String(editValues.roomCode ?? "")}
                                onChange={(e) => setEditValues((prev) => ({ ...prev, roomCode: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        ) : (
                            renderValue(roomCode)
                        )}
                    </DetailItem>

                    <DetailItem label="Room Type">
                        {isEditable && canEdit ? (
                            <select
                                value={String(editValues.type ?? room.type ?? "")}
                                onChange={(e) => setEditValues((prev) => ({ ...prev, type: e.target.value as RoomType }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                {roomTypesOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            renderValue(room.type ?? "—")
                        )}
                    </DetailItem>

                    <DetailItem label="Status">
                        {isEditable && canEditStatus ? (
                            <select
                                value={String(editValues.status ?? room.status ?? "")}
                                onChange={(e) => setEditValues((prev) => ({ ...prev, status: e.target.value as RoomStatus }))}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                {roomStatusOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            renderValue(
                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClasses(room.status)}`}>
                                    {room.status}
                                </span>
                            )
                        )}
                    </DetailItem>

                    <DetailItem label="Max Occupancy">
                        {isEditable && canEdit ? (
                            <input
                                type="number"
                                min={1}
                                value={String(editValues.maxOccupancy ?? "")}
                                onChange={(e) =>
                                    setEditValues((prev) => ({ ...prev, maxOccupancy: Number(e.target.value) }))
                                }
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        ) : (
                            renderValue(String(room.maxOccupancy ?? "—"))
                        )}
                    </DetailItem>

                    <div className="md:col-span-2">
                        <DetailItem label="Room Description / Amenities">
                            {isEditable && canEdit ? (
                                <textarea
                                    rows={4}
                                    value={String(editValues.description ?? "")}
                                    onChange={(e) => setEditValues((prev) => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                            ) : (
                                renderValue(
                                    <span className="whitespace-pre-wrap text-gray-800">{room.description || "—"}</span>
                                )
                            )}
                        </DetailItem>
                    </div>
                </div>

                {room.status === RoomStatus.Occupied && (
                    <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                        <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Guest Information</div>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailItem label="Current Guest">
                                {renderValue(currentGuest || '—')}
                            </DetailItem>
                            <DetailItem label="Check-Out Date">
                                {renderValue(checkOutDate || '—')}
                            </DetailItem>
                        </div>
                    </div>
                )}
                {isEditable && (canEdit || canEditStatus) && (
                    <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveAll}
                            disabled={!hasChanges || isSaving}
                            className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default RoomDetailsModal;
