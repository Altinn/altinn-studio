import React from 'react';

import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
export function QueryDevtools() {
  return <ReactQueryDevtools initialIsOpen={false} />;
}
