// import { IFormDesignerState } from '../reducers/formDesignerReducer';
import { ILayoutComponent, ILayoutContainer } from '../features/form/layout/';

/*
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
*/

/*
* Returns the layout element with the given id, or undefined if no such element exists
*/
export function getLayoutElementById(elementId: string, formLayout: [ILayoutComponent | ILayoutContainer]):
  ILayoutComponent | ILayoutContainer {
  if (!formLayout || !elementId) {
    return undefined;
  }
  return formLayout.find((element) => element.id === elementId);
}

/*
* Returns the index of the layout element with the given id, or -1 if no such element exists
*/
export function getLayoutElementIndexById(elementId: string, formLayout: [ILayoutComponent | ILayoutContainer]):
  number {
  if (!elementId || !formLayout) {
    return -1;
  }
  return formLayout.findIndex((element) => element.id === elementId);
}
