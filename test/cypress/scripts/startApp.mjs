import { runCommand, getEnvVariableOrExit } from './utils.mjs';

const init = async () => {
  const appPath = getEnvVariableOrExit('APP_PATH');

  await runCommand('dotnet run', { cwd: `${appPath}/App` });
};

init();
