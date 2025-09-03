import React, { createContext, useContext } from 'react';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  // Minimal stub: no auth logic yet
  const user = null;
  const login = () => {};
  const logout = () => {};

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
  