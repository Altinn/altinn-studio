import React from 'react';
import { Outlet } from 'react-router-dom';

// TODO : https://github.com/Altinn/altinn-studio/issues/13271
export const PageLayout = (): React.ReactNode => {
  return (
    <div>
      <Outlet />
    </div>
  );
};
