import { useParams } from 'react-router-dom';
import { APP_DASHBOARD_BASENAME } from 'app-shared/constants';
import { StringUtils } from 'libs/studio-pure-functions/src';

export function useSubroute(): string {
  const { subroute = defaultSubroute } = useParams();
  return subroute;
}

const defaultSubroute = StringUtils.removeLeadingSlash(APP_DASHBOARD_BASENAME);
