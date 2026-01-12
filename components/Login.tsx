import React, { useEffect, useState } from 'react';
import Input from './ui/Input';
import Button from './ui/Button';
import Modal from './ui/Modal';
import { Hotel, Mail, Lock, ArrowRight, KeyRound } from 'lucide-react';
import { authService } from '../services/auth.service';

interface LoginProps {
    onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberEmail, setRememberEmail] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isForgotOpen, setIsForgotOpen] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotStatus, setForgotStatus] = useState<string | null>(null);

    useEffect(() => {
        const remembered = localStorage.getItem('remembered_email');
        if (remembered) setEmail(remembered);
    }, []);

    const validate = () => {
        if (!email.trim() || !password.trim()) {
            setError('Please enter your email and password.');
            return false;
        }
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
        if (!emailOk) {
            setError('Please enter a valid email address.');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!validate()) return;

        setIsLoading(true);
        try {
            const res: any = await authService.login({
                username: email.trim(),
                password,
            });
            const token = res?.token ?? '';
            if (res?.admin) {
                localStorage.setItem('auth_admin', JSON.stringify(res.admin));
            }
            if (token) localStorage.setItem('auth_token', token);
            if (rememberEmail) {
                localStorage.setItem('remembered_email', email.trim());
            } else {
                localStorage.removeItem('remembered_email');
            }
            onLogin();
        } catch (err: any) {
            const msg = err?.body?.error || err?.message || 'Login failed.';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-sky-50 px-4 py-10">
            <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white/90 shadow-2xl backdrop-blur-sm">
                <div className="p-8">
                    <div className="text-center">
                        <div className="flex items-center justify-center mb-4">
                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-600 to-blue-700 shadow-lg shadow-sky-600/30 flex items-center justify-center">
                                <Hotel className="h-6 w-6 text-white" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-wide">HOTEL</h1>
                        <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
                    </div>

                    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <Input
                                id="email-address"
                                label="Email address"
                                type="email"
                                autoComplete="email"
                                required
                                placeholder="you@hotel.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <Input
                                id="password"
                                label="Password"
                                type="password"
                                autoComplete="current-password"
                                required
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 text-gray-600">
                                <input
                                    type="checkbox"
                                    checked={rememberEmail}
                                    onChange={(e) => setRememberEmail(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                                />
                                Remember my email
                            </label>
                            <button
                                type="button"
                                onClick={() => {
                                    setForgotEmail(email);
                                    setForgotStatus(null);
                                    setIsForgotOpen(true);
                                }}
                                className="font-medium text-blue-600 hover:text-blue-500"
                            >
                                Forgot password?
                            </button>
                        </div>

                        {error && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                            <span className="flex items-center justify-center gap-2">
                                {isLoading ? "Signing in..." : "Login"}
                                <ArrowRight size={18} />
                            </span>
                        </Button>
                    </form>
                </div>
            </div>

            {isForgotOpen && (
                <Modal isOpen={isForgotOpen} onClose={() => setIsForgotOpen(false)} title="Reset password">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            Enter your email and we will send you a reset link.
                        </p>
                        <Input
                            id="forgot-email"
                            label="Email address"
                            type="email"
                            autoComplete="email"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                        />
                        {forgotStatus && <p className="text-sm text-gray-700">{forgotStatus}</p>}
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="secondary" onClick={() => setIsForgotOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={async () => {
                                    setForgotStatus(null);
                                    if (!forgotEmail.trim()) {
                                        setForgotStatus('Please enter your email.');
                                        return;
                                    }
                                    try {
                                        await authService.forgotPassword({ email: forgotEmail.trim() });
                                        setForgotStatus('If this email exists, a reset link was sent.');
                                    } catch {
                                        setForgotStatus('Failed to send reset link. Please try again.');
                                    }
                                }}
                            >
                                <span className="flex items-center gap-2">
                                    Send reset link
                                    <KeyRound size={16} />
                                </span>
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Login;
