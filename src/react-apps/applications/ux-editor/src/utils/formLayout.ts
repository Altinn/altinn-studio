import { IFormDesignerState } from '../reducers/formDesignerReducer';

export function getParentContainerId(containerId: string, formDesignerState: IFormDesignerState): string {
  const order = formDesignerState.layout.order;
  const baseContainerId = Object.keys(formDesignerState.layout.order)[0];
  for (const containerKey in order) {
    if (containerKey) {
      for (const elementId of order[containerKey]) {
        if (elementId === containerId) {
          return containerKey;
        }
      }
    }
  }
  return baseContainerId;
}
