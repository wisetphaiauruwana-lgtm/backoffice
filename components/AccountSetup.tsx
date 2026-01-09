import React from 'react';
import Button from './ui/Button';
import PasswordInput from './ui/PasswordInput';
import { Hotel } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AccountSetup: React.FC = () => {
    const navigate = useNavigate();
    
    // In a real app, you'd get the user's name from a token in the URL.
    const userName = "Sarah";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, you'd submit the new password and then log the user in.
        alert('Account activated successfully! You will now be redirected to the login page.');
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-lg">
                <div className="text-center">
                    <div className="flex items-center justify-center mb-6">
                       <Hotel className="h-10 w-10 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-800">Welcome, {userName}!</h2>
                    <p className="text-gray-600 mt-2">
                        You have been invited to join Horizon Hotel.
                        Please create a secure password to activate your account.
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="flex flex-col gap-4">
                        <PasswordInput
                            id="new-password"
                            label="New Password"
                            autoComplete="new-password"
                            required
                            placeholder="Enter your new password"
                        />
                        <PasswordInput
                            id="confirm-password"
                            label="Confirm Password"
                            autoComplete="new-password"
                            required
                            placeholder="Confirm your new password"
                        />
                    </div>

                    <div className="text-xs text-gray-500 text-center">
                        <p>Password must be at least 8 characters.</p>
                    </div>

                    <div>
                        <Button type="submit" className="w-full" size="lg">
                            Activate Account
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AccountSetup;