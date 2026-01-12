import React, { useMemo, useState } from 'react';
import Button from './ui/Button';
import PasswordInput from './ui/PasswordInput';
import { Hotel } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Toast from './ui/Toast';
import { adminsService } from '../services/admins.service';

const AccountSetup: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    
    const email = useMemo(() => (searchParams.get('email') || '').trim(), [searchParams]);
    const token = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams]);
    const userLabel = email ? email.split('@')[0] : 'there';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setToast(null);

        if (!email || !token) {
            setError('Invalid or missing invitation link.');
            return;
        }
        if (password.trim().length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsSubmitting(true);
        try {
            await adminsService.activate({ email, token, password });
            setToast({ message: 'Account activated successfully. You can now log in.', type: 'success' });
            setTimeout(() => navigate('/login'), 1200);
        } catch (err: any) {
            const message = err?.body?.error || err?.body?.message || err?.message || 'Failed to activate account.';
            if (String(message).toLowerCase().includes('token expired')) {
                setToast({ message: 'This invite link is expired. Please log in or ask for a new invite.', type: 'error' });
                setTimeout(() => navigate('/login'), 1200);
                return;
            }
            if (String(message).toLowerCase().includes('invalid token')) {
                setToast({ message: 'This invite link is no longer valid. Please log in.', type: 'error' });
                setTimeout(() => navigate('/login'), 1200);
                return;
            }
            setToast({ message, type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 p-4">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-lg">
                <div className="text-center">
                    <div className="flex items-center justify-center mb-6">
                       <Hotel className="h-10 w-10 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-800">Welcome, {userLabel}!</h2>
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
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <PasswordInput
                            id="confirm-password"
                            label="Confirm Password"
                            autoComplete="new-password"
                            required
                            placeholder="Confirm your new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>

                    {error && <p className="text-sm text-red-600 text-center">{error}</p>}

                    <div className="text-xs text-gray-500 text-center">
                        <p>Password must be at least 8 characters.</p>
                    </div>

                    <div>
                        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || !email || !token}>
                            {isSubmitting ? 'Activating...' : 'Activate Account'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AccountSetup;
