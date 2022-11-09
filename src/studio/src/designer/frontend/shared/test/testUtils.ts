import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';

export const setWindowLocationForTests = (org: string, app: string) => {
  delete global.window.location;
  global.window.location = new URL(
    `https://www.example.com${APP_DEVELOPMENT_BASENAME}/${org}/${app}`,
  ) as unknown as Location;
};
