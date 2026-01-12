import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import Button from './ui/Button';
import Input from './ui/Input';
import PasswordInput from './ui/PasswordInput';
import { Hotel, CheckCircle } from 'lucide-react';
import { API_ORIGIN } from '../services/core/endpoints';

const ForgotPassword: React.FC = () => {
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const emailParam = useMemo(() => (searchParams.get('email') || '').trim(), [searchParams]);

  const API_BASE = API_ORIGIN;

  /**
   * ✅ ถ้า backend ของคุณใช้ route อื่น
   * ให้แก้แค่ 2 บรรทัดนี้
   */
  const FORGOT_ENDPOINT = `${API_BASE}/api/auth/forgot`;
  const RESET_ENDPOINT = `${API_BASE}/api/admins/activate`;

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [linkSent, setLinkSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const emailLooksValid = useMemo(() => {
    const v = email.trim();
    if (!v) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }, [email]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const parseErrorMessage = async (res: Response) => {
    try {
      const data = await res.json();
      return data?.error || 'Request failed';
    } catch {
      return 'Request failed';
    }
  };

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    const vEmail = email.trim().toLowerCase();
    if (!vEmail) {
      setError('Email is required.');
      return;
    }
    if (!emailLooksValid) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(FORGOT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: vEmail }),
      });

      if (!res.ok) {
        const msg = await parseErrorMessage(res);
        setError(msg);
        return;
      }

      // ✅ security: backend อาจตอบ ok แม้ไม่เจอ user
      setLinkSent(true);
    } catch {
      setError('Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!token) {
      setError('Missing reset token.');
      return;
    }

    if (!emailParam) {
      setError('Missing email.');
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(RESET_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailParam,
          token,
          password: newPassword,
        }),
      });

      if (!res.ok) {
        const msg = await parseErrorMessage(res);
        setError(msg);
        return;
      }

      setSuccess('Password has been reset successfully!');
      setTimeout(() => navigate('/login'), 1500);
    } catch {
      setError('Reset failed');
    } finally {
      setLoading(false);
    }
  };

  const renderRequestForm = () => (
    <>
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-800">Forgot Your Password?</h2>
        <p className="text-gray-600 mt-2">
          No problem. Enter your email address below and we'll send you a link to reset it.
        </p>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleSendLink}>
        <Input
          id="email-address"
          label="Email address"
          type="email"
          value={email}
          onChange={(e: any) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          disabled={loading}
        />

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        {success && <p className="text-sm text-green-600 text-center">{success}</p>}

        <div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </div>

        <div className="text-center">
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 text-sm">
            Back to Login
          </Link>
        </div>
      </form>
    </>
  );

  const renderLinkSentMessage = () => (
    <div className="text-center space-y-4">
      <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
      <h2 className="text-2xl font-semibold text-gray-800">Check Your Email</h2>
      <p className="text-gray-600">
        If an account exists for <span className="font-semibold text-gray-800">{email.trim()}</span>,
        we’ve sent a password reset link. Please check your inbox and follow the instructions.
      </p>

      <div className="space-y-2">
        <button
          type="button"
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
          disabled={loading}
          onClick={() => {
            // ส่งใหม่ได้
            setLinkSent(false);
            setSuccess('');
            setError('');
          }}
        >
          Send again
        </button>

        <div>
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 text-sm">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );

  const renderResetForm = () => (
    <>
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-800">Set New Password</h2>
        <p className="text-gray-600 mt-2">Please create a new, secure password for your account.</p>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
        <div className="flex flex-col gap-4">
          <PasswordInput
            id="new-password"
            label="New Password"
            value={newPassword}
            onChange={(e: any) => setNewPassword(e.target.value)}
            required
            placeholder="Enter your new password"
            disabled={loading}
          />
          <PasswordInput
            id="confirm-password"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={(e: any) => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirm your new password"
            disabled={loading}
          />
        </div>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        {success && <p className="text-sm text-green-600 text-center">{success}</p>}

        <div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </div>

        <div className="text-center">
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 text-sm">
            Back to Login
          </Link>
        </div>
      </form>
    </>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-lg">
        <div className="flex items-center justify-center mb-6">
          <Hotel className="h-10 w-10 text-blue-600" />
        </div>

        {token ? renderResetForm() : linkSent ? renderLinkSentMessage() : renderRequestForm()}
      </div>
    </div>
  );
};

export default ForgotPassword;
