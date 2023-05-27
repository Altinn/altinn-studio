import React from 'react';
import { Outlet } from 'react-router-dom';

export const TestPage = () => {
  return (
    <div>
      <h1>Dette er TestPage /m Outlet for wrap av TestPage2</h1>
      <Outlet />
    </div>
  );
};
