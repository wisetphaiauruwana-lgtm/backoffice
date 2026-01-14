import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from './components/MainLayout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import RoomManagement from './components/RoomManagement';
import CustomerList from './components/CustomerList';
import RolesAndPermissions from './components/RolesAndPermissions';
import BookingManagement from './components/BookingManagement';
import CreateBooking from './components/CreateBooking';
import GovernmentReports from './components/GovernmentReports';
import Settings from './components/Settings';
import AccountSetup from './components/AccountSetup';
import BookingDetailsModal from './components/BookingDetailsModal';
import ForgotPassword from './components/ForgotPassword';

import { DataProvider } from './contexts/DataContext';
import { BookingsProvider } from './contexts/BookingsContext';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem('auth_token');
    const admin = localStorage.getItem('auth_admin');
    return Boolean(token || admin);
  });

  const handleLogin = () => setIsAuthenticated(true);
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_admin');
    setIsAuthenticated(false);
  };

  return (
    <DataProvider>
      <BookingsProvider>
        <HashRouter>
          <Routes>
            <Route
              path="/login"
              element={
                !isAuthenticated ? (
                  <Login onLogin={handleLogin} />
                ) : (
                  <Navigate to="/dashboard" />
                )
              }
            />

            <Route path="/setup-account" element={<AccountSetup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/forgot-password/:token" element={<ForgotPassword />} />

            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <MainLayout onLogout={handleLogout} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            >
              <Route index element={<Navigate to="/dashboard" />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="bookings" element={<BookingManagement />} />
              <Route path="bookings/create" element={<CreateBooking />} />
              <Route path="booking-details" element={<BookingDetailsModal />} />
              <Route path="rooms" element={<RoomManagement />} />
              <Route path="customers" element={<CustomerList />} />
              <Route path="reports" element={<GovernmentReports />} />
              <Route path="roles" element={<RolesAndPermissions />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route
              path="*"
              element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />}
            />
          </Routes>
        </HashRouter>
      </BookingsProvider>
    </DataProvider>
  );
};

export default App;
