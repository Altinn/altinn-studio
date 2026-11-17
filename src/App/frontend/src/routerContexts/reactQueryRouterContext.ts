import { createContext } from 'react-router';

import type { AppQueryClient } from 'src/core/queries/queryClient';

export const queryClientContext = createContext<AppQueryClient>();
