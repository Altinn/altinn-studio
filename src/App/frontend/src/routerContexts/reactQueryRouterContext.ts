import { createContext } from 'react-router';

import type { QueryClient } from '@tanstack/react-query';

export const queryClientContext = createContext<QueryClient>();
