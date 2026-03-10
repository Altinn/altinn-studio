import React from 'react';
import { Outlet } from 'react-router-dom';

export const PageLayout = (): React.ReactNode => {
  return (
    <div>
      <Outlet />
    </div>
  );
};
