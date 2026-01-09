import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import { Mail } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Customer } from '../../types';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSend: (finalEmail: string) => void;
  customer: Customer | null;
}

const SummaryItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div>
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">{label}</p>
        <p className="text-gray-800">{value}</p>
    </div>
);

const SendEmailModal: React.FC<SendEmailModalProps> = ({ isOpen, onClose, onConfirmSend, customer }) => {
  const { rooms } = useData();
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (customer) {
        setEmail(customer.email);
    }
  }, [customer]);

  const handleSend = () => {
    onConfirmSend(email);
  };
  
  const stayDuration = useMemo(() => {
    if (!customer?.checkInDate || !customer?.checkOutDate) return 0;
    const start = new Date(customer.checkInDate);
    const end = new Date(customer.checkOutDate);
    if (start.getTime() >= end.getTime()) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [customer]);
  
  const roomDetails = useMemo(() => {
      if (!customer) return null;
      const roomCode = customer.roomStays[0]?.roomNumber;
      return rooms.find(r => r.roomCode === roomCode);
  }, [customer, rooms]);
  
  if(!customer) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Booking Confirmation">
      <div className="space-y-6">
        <div>
          <Input
            id="recipient-email"
            label="To (Email Address)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Email Content Preview</label>
           <div className="border rounded-lg p-4 bg-gray-50 text-sm space-y-4">
               <SummaryItem label="Main Guest" value={customer.fullName} />
               <SummaryItem label="Email" value={customer.email} />
               <SummaryItem label="Number of Guests" value={`${customer.adults} Adult(s), ${customer.children} Child(ren)`} />
               <div className="grid grid-cols-2 gap-4">
                   <SummaryItem label="Stay From" value={`${customer.checkInDate}, 14:00`} />
                   <SummaryItem label="Stay To" value={`${customer.checkOutDate}, 12:00`} />
               </div>
               <SummaryItem label="Nights" value={`${stayDuration} Night(s)`} />
               <SummaryItem label="Room Type" value={`${roomDetails?.type || 'N/A'}, ${roomDetails?.floorAndview || ''}`} />
                 <SummaryItem label="Room Charge" value={
                   roomDetails && stayDuration > 0
                     ? `THB ${(roomDetails.price * stayDuration).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                     : 'N/A'
                 } />
           </div>
        </div>

        <div className="flex justify-end pt-4 space-x-2 border-t">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSend} leftIcon={<Mail size={16}/>}>
            Send Email Now
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SendEmailModal;