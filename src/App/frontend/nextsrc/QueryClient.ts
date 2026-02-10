import { QueryClient } from '@tanstack/react-query';

// export const createQueryClient = () => new QueryClient();
//
// // singleton for client-side apps
// let client: QueryClient | undefined;
//
// export const getQueryClient = () => {
//   if (!client) {
//     client = createQueryClient();
//   }
//   return client;
// };

export const queryClient = new QueryClient({});
