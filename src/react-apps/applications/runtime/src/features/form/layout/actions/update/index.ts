import { Action } from 'redux';
import { ILayoutComponent, ILayoutContainer } from '../../types';
import { UPDATE_FORM_LAYOUT } from '../types';

export interface IUpdateFormLayout extends Action {
  layoutElement: ILayoutContainer | ILayoutComponent;
  index: number;
}

export function updateFormLayout(layoutElement: ILayoutComponent | ILayoutContainer, index: number): IUpdateFormLayout {
  return ({
    type: UPDATE_FORM_LAYOUT,
    layoutElement,
    index,
  });
}
