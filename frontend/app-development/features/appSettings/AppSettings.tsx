import React from 'react';
import type { ReactElement } from 'react';
import { useLocation } from 'react-router-dom';
import type { RoutePaths } from 'app-development/enums/RoutePaths';

export function AppSettings(): ReactElement {
  const location = useLocation();
  const state = location.state as { from: RoutePaths };

  return <div>Previous page: {state?.from ?? 'Ingen'}</div>;
}
