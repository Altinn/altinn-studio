import { createContext } from 'react-router';

import type { ApiClients } from 'src/core/api-client/ApiClients';

export const apiClientsContext = createContext<ApiClients>();
