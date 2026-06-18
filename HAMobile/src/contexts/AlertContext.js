import React, { createContext, useState, useContext, useCallback } from 'react';

const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'success', // 'success' | 'error' | 'warning'
    onConfirm: null,
  });

  const showAlert = useCallback((title, message, type = 'success', onConfirm = null) => {
    setAlert({
      visible: true,
      title,
      message,
      type,
      onConfirm,
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert, alert }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert debe ser usado dentro de un AlertProvider');
  }
  return context;
};
