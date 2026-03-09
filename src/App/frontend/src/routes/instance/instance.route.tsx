import React from 'react';
import { Outlet } from 'react-router';

import { InstanceProvider } from 'src/features/instance/InstanceContext';

export function Component() {
  return (
    <InstanceProvider>
      <Outlet />
    </InstanceProvider>
  );
}
