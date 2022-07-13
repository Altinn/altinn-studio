export interface IInstantiationState {
  instantiating: boolean;
  instanceId: string;
  error: Error;
}

export interface IInstantiateFulfilled {
  instanceId: string;
}

export interface IInstantiateRejected {
  error: Error;
}
