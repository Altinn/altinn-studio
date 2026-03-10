import type { QueryClient } from '@tanstack/react-query';

export function indexLoader(_: QueryClient) {
  return function loader() {
    // this is a placeholder, will move redirection logic here in next PR
    return null;
  };
}
