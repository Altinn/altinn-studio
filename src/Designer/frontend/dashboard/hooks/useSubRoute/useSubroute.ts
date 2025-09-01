import { useParams } from 'react-router-dom';
import { APP_DASHBOARD_BASENAME } from 'app-shared/constants';
import { StringUtils } from '@studio/pure-functions';

export function useSubroute(): string {
  const { subroute = defaultSubroute } = useParams();
  return subroute;
}

const defaultSubroute = StringUtils.removeLeadingSlash(APP_DASHBOARD_BASENAME);
