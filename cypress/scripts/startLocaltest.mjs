import { runCommand, getEnvVariableOrExit } from './utils.mjs';

const init = async () => {
  const localTestPath = getEnvVariableOrExit('LOCALTEST_PATH');

  await runCommand('docker-compose up -d --build', { cwd: localTestPath });
  await runCommand('dotnet run', { cwd: `${localTestPath}/LocalTest` });
};

init();
