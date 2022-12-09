import 'dotenv/config';
import { execaCommand } from 'execa';

export const runCommand = async (command, options) => {
  const allOptions = {
    ...options,
    all: true,
  };
  const subprocess = execaCommand(command, allOptions);
  subprocess.all.on('data', (chunk) => console.log(chunk.toString()));
  await subprocess;
};

export const getEnvVariableOrExit = (variableName) => {
  const variable = process.env[variableName];

  if (!variable) {
    console.error(`Error: "${variableName}" environment variable is not set`);
    console.error('Please add it to .env file, see README.md for details');
    process.exit(-1);
  }

  return variable;
};
