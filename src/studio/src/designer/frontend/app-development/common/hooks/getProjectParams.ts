import { matchPath } from 'react-router-dom';

export const getProjectParams = () => {
  const { params } = matchPath(
    { path: '/:solution/:org/:app', end: false },
    window.location.pathname
  );
  const { org, app } = params;
  return { org, app };
};
