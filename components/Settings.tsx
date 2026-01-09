
import React, { useState, useMemo } from 'react';
import Input from './ui/Input';
import Textarea from './ui/Textarea';
import Button from './ui/Button';
import UserManagement from './UserManagement'; // Import the new component
import { Image, Building, FileText, BedDouble, Users, Mail, Save } from 'lucide-react';
import { useData } from '../contexts/DataContext';


type SettingsCategory = 'general' | 'policies' | 'rooms' | 'users' | 'email';

const Settings: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState<SettingsCategory>('general');
    const data = useData();
    if (!data) {
        return (
            <div className="p-6 text-center text-gray-500">
                Loading settings...
            </div>
        );
    }

    const roles = useMemo(() => data.roles ?? [], [data.roles]);
    const allUsers = useMemo(() => data.allUsers ?? [], [data.allUsers]);



    const categories: { id: SettingsCategory; label: string; icon: React.ElementType }[] = [
        { id: 'general', label: 'General Information', icon: Building },
        { id: 'policies', label: 'Hotel Policies', icon: FileText },
        { id: 'rooms', label: 'Room Types & Pricing', icon: BedDouble },
        { id: 'users', label: 'Users & Roles', icon: Users },
        { id: 'email', label: 'Email Configuration', icon: Mail },
    ];

    // Mock data for forms
    const [generalInfo, setGeneralInfo] = useState({
        hotelName: 'Horizon Hotel & Suites',
        address: '123 Beachfront Ave, Phuket, Thailand',
        phone: '+66 76 123 456',
        email: 'contact@horizonhotel.com',
        website: 'https://www.horizonhotel.com',
    });

    const [policies, setPolicies] = useState({
        checkIn: '14:00',
        checkOut: '12:00',
        vat: '7',
        serviceCharge: '10',
    });

    const handleGeneralInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setGeneralInfo({ ...generalInfo, [e.target.id]: e.target.value });
    };

    const handlePoliciesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPolicies({ ...policies, [e.target.id]: e.target.value });
    };


    const renderContent = () => {
        switch (activeCategory) {
            case 'general':
                return (
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 mb-6">General Hotel Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <Input id="hotelName" label="Hotel Name" value={generalInfo.hotelName} onChange={handleGeneralInfoChange} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hotel Logo</label>
                                <div className="mt-1 flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                                        <Building size={32} className="text-gray-400" />
                                    </div>
                                    <button
                                        type="button"
                                        className="relative overflow-hidden cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        <Image size={16} className="inline-block mr-2" />
                                        <span>Change Photo</span>
                                        <input type="file" className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" />
                                    </button>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <Textarea id="address" label="Address" value={generalInfo.address} onChange={handleGeneralInfoChange} />
                            </div>
                            <Input id="phone" label="Phone Number" value={generalInfo.phone} onChange={handleGeneralInfoChange} />
                            <Input id="email" label="Contact Email" type="email" value={generalInfo.email} onChange={handleGeneralInfoChange} />
                            <Input id="website" label="Website" value={generalInfo.website} onChange={handleGeneralInfoChange} />
                        </div>
                        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
                            <Button leftIcon={<Save size={18} />} onClick={() => alert('Settings saved!')}>Save Changes</Button>
                        </div>
                    </div>
                );
            case 'policies':
                return (
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 mb-6">Hotel Policies</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg">
                            <Input id="checkIn" label="Standard Check-In Time" type="time" value={policies.checkIn} onChange={handlePoliciesChange} />
                            <Input id="checkOut" label="Standard Check-Out Time" type="time" value={policies.checkOut} onChange={handlePoliciesChange} />
                            <Input id="vat" label="VAT / Tax (%)" type="number" value={policies.vat} onChange={handlePoliciesChange} />
                            <Input id="serviceCharge" label="Service Charge (%)" type="number" value={policies.serviceCharge} onChange={handlePoliciesChange} />
                        </div>
                        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
                            <Button leftIcon={<Save size={18} />} onClick={() => alert('Settings saved!')}>Save Changes</Button>
                        </div>
                    </div>
                );
            case 'users':
                // ✅ กัน crash ถ้า data ยังไม่พร้อม
                if (!Array.isArray(roles) || !Array.isArray(allUsers)) {
                    return (
                        <div className="text-center text-gray-500 py-10">
                            Loading user data...
                        </div>
                    );
                }

                return <UserManagement />;

            default:
                return <div className="text-center text-gray-500 py-10">This section is under construction.</div>;
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Settings</h1>
            <div className="flex flex-col md:flex-row gap-8">
                {/* Left Sidebar */}
                <aside className="w-full md:w-1/4 lg:w-1/5">
                    <nav className="space-y-1">
                        {categories.map(category => (
                            <button
                                key={category.id}
                                onClick={() => setActiveCategory(category.id)}
                                className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${activeCategory === category.id
                                    ? 'bg-blue-600 text-white shadow'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <category.icon className="h-5 w-5 mr-3" />
                                <span>{category.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Right Panel */}
                <main className="flex-1">
                    <div className="bg-white p-6 rounded-xl shadow-sm min-h-[60vh] flex flex-col">
                        <div className="flex-1">
                            {renderContent()}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Settings;
