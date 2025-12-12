import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { instanceStore } from 'nextsrc/nextpoc/stores/instanceStore';
import { useStore } from 'zustand';

export const Instance = () => {
  const { instance } = useStore(instanceStore); //instanceStore.getState();
  return (
    <div>
      {instance?.process.currentTask.elementId && <Navigate to={`${instance?.process.currentTask.elementId}`} />}
      <Outlet />
    </div>
  );
};
