import { useMatch } from 'react-router-dom';
import { APP_DASHBOARD_BASENAME } from 'app-shared/constants';

export function useSubroute(): string {
  const match = useMatch(`/:subroute/*`);
  return match?.params?.subroute || defaultSubroute;
}

const defaultSubroute = APP_DASHBOARD_BASENAME;
