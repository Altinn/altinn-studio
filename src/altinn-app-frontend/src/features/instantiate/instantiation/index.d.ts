export interface IInstantiationState {
  instantiating: boolean;
  instanceId: string | null;
  error: Error | null;
}

export interface IInstantiateFulfilled {
  instanceId: string;
}

export interface IInstantiateRejected {
  error: Error | null;
}
