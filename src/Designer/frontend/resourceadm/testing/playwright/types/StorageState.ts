export interface Cookie {
  name: string;
  value: string;
}

export interface StorageState {
  cookies: Cookie[];
}
