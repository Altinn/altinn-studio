import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * The environment the tests run against. Like `--env environment=<name>` for Cypress, this selects the file in
 * test/e2e/config/ that holds the base URL and the test users. Only localtest has a working login so far.
 */
export const validEnvironments = ['localtest', 'tt02'] as const;
export type EnvironmentName = (typeof validEnvironments)[number];

type EnvironmentFile = {
  baseUrl: string;
  expose: Record<string, string> & { type: string };
};

export type Environment = {
  name: EnvironmentName;
  baseUrl: string;
  isLocaltest: boolean;
  expose: EnvironmentFile['expose'];
};

const configDir = path.resolve(import.meta.dirname, '../../config');

export function loadEnvironment(name = process.env.E2E_ENVIRONMENT ?? 'localtest'): Environment {
  if (!(validEnvironments as readonly string[]).includes(name)) {
    throw new Error(`Unknown environment "${name}" in E2E_ENVIRONMENT
Valid environments are:
- ${validEnvironments.join('\n- ')}`);
  }

  const file = JSON.parse(readFileSync(path.join(configDir, `${name}.json`), 'utf8')) as EnvironmentFile;
  return {
    name: name as EnvironmentName,
    baseUrl: file.baseUrl,
    isLocaltest: file.expose.type === 'localtest',
    expose: file.expose,
  };
}

export const environment = loadEnvironment();

export function getTargetUrl(appName: string): string {
  return environment.isLocaltest
    ? `${environment.baseUrl}/ttd/${appName}`
    : `https://ttd.apps.${environment.baseUrl.slice(8)}/ttd/${appName}`;
}
