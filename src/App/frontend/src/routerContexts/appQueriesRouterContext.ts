import { createContext } from 'react-router';

import type { AppQueriesContext } from 'src/core/queries/types';

export const appQueriesContext = createContext<AppQueriesContext>();
