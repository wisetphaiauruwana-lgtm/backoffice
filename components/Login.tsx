import React from 'react';
import Input from './ui/Input';
import Button from './ui/Button';
import { Hotel } from 'lucide-react';

interface LoginProps {
    onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-lg">
                <div className="text-center">
                    <div className="flex items-center justify-center mb-4">
                       <Hotel className="h-10 w-10 mr-3 text-blue-600" />
                       <h1 className="text-3xl font-bold text-gray-800 tracking-wider">HOTEL</h1>
                    </div>   
                    <h2 className="text-xl text-gray-600">Sign in to your account</h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px flex flex-col gap-4">
                        <Input
                            id="email-address"
                            label="Email address"
                            type="email"
                            autoComplete="email"
                            required
                            placeholder="Email address"
                        />
                        <Input
                            id="password"
                            label="Password"
                            type="password"
                            autoComplete="current-password"
                            required
                            placeholder="Password"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="text-sm">
                            <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                                Forgot your password?
                            </a>
                        </div>
                    </div>

                    <div>
                        <Button type="submit" className="w-full" size="lg">
                            Login
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
