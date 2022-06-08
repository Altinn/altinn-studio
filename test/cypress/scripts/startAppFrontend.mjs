import { runCommand, getEnvVariableOrExit } from './utils.mjs';

const init = async () => {
  const appFrontendPath = getEnvVariableOrExit('APP_FRONTEND_PATH');

  await runCommand('yarn --immutable', { cwd: `${appFrontendPath}/src` });
  await runCommand('yarn start', { cwd: `${appFrontendPath}/src/altinn-app-frontend` });
};

init();
