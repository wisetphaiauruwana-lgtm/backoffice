import React, { useState, useEffect } from 'react';
import Modal from './ui/Modal';
import { Customer, VisaType, TM30Status } from '../types';
import DoubleClickEditableField from './ui/DoubleClickEditableField';
// FIX: Correctly import `useMockDataHook` and alias it as `useMockData` to resolve the module export error.


interface CustomerProfile {
    // This prop structure is from CustomerList page.
    // The details modal now only needs the latest record and can calculate total bookings itself.
    latestCustomerRecord: Customer;
}

interface ImmigrationDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerProfile: CustomerProfile | null;
    onUpdateCustomer: (updatedRecord: Customer) => void;
}

const nationalities = ['American', 'British', 'Canadian', 'Australian', 'German', 'French', 'Japanese', 'Chinese'];
const tm30Statuses: TM30Status[] = [TM30Status.Pending, TM30Status.Submitted, TM30Status.Acknowledged];

const DetailItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
        <dt className="text-sm font-medium leading-6 text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm leading-6 text-gray-800 sm:col-span-2 sm:mt-0">{children}</dd>
    </div>
);

const ImmigrationDetailsModal: React.FC<ImmigrationDetailsModalProps> = ({ isOpen, onClose, customerProfile, onUpdateCustomer }) => {
  
    const [customerData, setCustomerData] = useState<Customer | null>(customerProfile?.latestCustomerRecord ?? null);

    useEffect(() => {
        setCustomerData(customerProfile?.latestCustomerRecord ?? null);
    }, [customerProfile]);

    const handleSave = (field: keyof Customer, value: any) => {
        if (customerData) {
            const updatedCustomer = { ...customerData, [field]: value };
            setCustomerData(updatedCustomer);
            onUpdateCustomer(updatedCustomer);
        }
    };

    if (!customerData || !customerProfile) return null;
    
    // Calculate total bookings based on email, as the profile might not have the count directly.
   


    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Immigration Details: ${customerData.fullName}`}>
            <div>
                 <div className="border-t border-gray-200">
                    <dl className="divide-y divide-gray-200">
                        <DetailItem label="Name and Surname (ชื่อคนต่างด้าว)">
                            <DoubleClickEditableField label="Name and Surname" initialValue={customerData.fullName} onSave={(val) => handleSave('fullName', val)} />
                        </DetailItem>
                        <DetailItem label="Nationality (สัญชาติ)">
                             <DoubleClickEditableField label="Nationality" type="select" initialValue={customerData.nationality} options={nationalities} onSave={(val) => handleSave('nationality', val)} />
                        </DetailItem>
                        <DetailItem label="Passport No. (หนังสือเดินทาง)">
                            <DoubleClickEditableField label="Passport No." initialValue={customerData.passportId} onSave={(val) => handleSave('passportId', val)} />
                        </DetailItem>
                        <DetailItem label="Date of Arrival (วันเดินทางเข้า)">
                            <DoubleClickEditableField label="Date of Arrival" type="date" initialValue={customerData.checkInDate} onSave={(val) => handleSave('checkInDate', val)} />
                        </DetailItem>
                       
                         <DetailItem label="Expire date of stay (ครบกำหนดอนุญาต)">
                            {/* FIX: Corrected property name from 'visaExpiryDate' to 'expireDateOfStay' to match the Customer type definition. */}
                            <DoubleClickEditableField label="Expire date of stay" type="date" initialValue={customerData.expireDateOfStay} onSave={(val) => handleSave('expireDateOfStay', val)} />
                        </DetailItem>
                        <DetailItem label="Point of entry (ช่องทางเข้า)">
                             
                        </DetailItem>
                         <DetailItem label="Arrival card TM.No. (บัตรขาเข้าเลขที่)">
                            <DoubleClickEditableField label="Arrival card TM.No." initialValue={customerData.arrivalCardNumber} onSave={(val) => handleSave('arrivalCardNumber', val)} />
                        </DetailItem>
                        <DetailItem label="Relationship (ความเกี่ยวพัน)">
                             <DoubleClickEditableField label="Relationship" type="text" initialValue={customerData.relationship} onSave={(val) => handleSave('relationship', val)} />
                        </DetailItem>
                         <DetailItem label="TM.30 Submission Status">
                            <DoubleClickEditableField 
                                label="TM.30 Submission Status" 
                                type="select" 
                                initialValue={customerData.tm30Status} 
                                onSave={(val) => handleSave('tm30Status', val)} 
                                options={tm30Statuses}
                            />
                        </DetailItem>
                       
                    </dl>
                </div>
            </div>
        </Modal>
    );
};

export default ImmigrationDetailsModal;