import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';

export const TEST_DOMAIN = 'http://localhost';

export const setWindowLocationForTests = (org: string, app: string) => {
  delete global.window.location;
  global.window.location = new URL(
    `${TEST_DOMAIN}${APP_DEVELOPMENT_BASENAME}/${org}/${app}`
  ) as unknown as Location;
};
