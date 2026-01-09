import React, { createContext, useContext, useState } from 'react';
import { Room, Customer } from '../types';

export type DataContextType = {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;

  bookings: Customer[];
  setBookings: React.Dispatch<React.SetStateAction<Customer[]>>;

  rooms: Room[];
  setRooms: React.Dispatch<React.SetStateAction<Room[]>>;
};

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Customer[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  return (
    <DataContext.Provider
      value={{
        customers,
        setCustomers,
        bookings,
        setBookings,
        rooms,
        setRooms,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
