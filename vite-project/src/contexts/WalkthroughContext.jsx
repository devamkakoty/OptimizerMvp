import React, { createContext, useContext, useState } from 'react';

const WalkthroughContext = createContext();

export const useWalkthrough = () => {
  const context = useContext(WalkthroughContext);
  if (!context) {
    throw new Error('useWalkthrough must be used within WalkthroughProvider');
  }
  return context;
};

export const WalkthroughProvider = ({ children }) => {
  const [showModal, setShowModal] = useState(false);

  const openWalkthrough = () => {
    setShowModal(true);
  };

  const closeWalkthrough = () => {
    setShowModal(false);
  };

  const value = {
    showModal,
    openWalkthrough,
    closeWalkthrough
  };

  return (
    <WalkthroughContext.Provider value={value}>
      {children}
    </WalkthroughContext.Provider>
  );
};
