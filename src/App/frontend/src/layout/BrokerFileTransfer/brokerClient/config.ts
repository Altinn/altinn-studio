export const BROKER_API_PREFIX = '/broker/api/v1';

export type BrokerClientConfig = {
  baseUrl: string;
  redirectIfSessionEnded: () => Promise<boolean>;
};

let config: BrokerClientConfig = {
  baseUrl: '',
  redirectIfSessionEnded: async () => false,
};

export function configureBrokerClient(changes: Partial<BrokerClientConfig>): void {
  const merged = { ...config, ...changes };
  config = { ...merged, baseUrl: merged.baseUrl.replace(/\/$/, '') };
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${config.baseUrl}${normalized}`;
}

export function redirectIfSessionEnded(): Promise<boolean> {
  return config.redirectIfSessionEnded();
}
