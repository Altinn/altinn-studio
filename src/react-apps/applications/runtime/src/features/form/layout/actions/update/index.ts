import { Action } from 'redux';
import { ILayoutComponent, ILayoutGroup } from '../..';
import { UPDATE_FORM_LAYOUT } from '../types';

export interface IUpdateFormLayout extends Action {
  layoutElement: ILayoutGroup | ILayoutComponent;
  index: number;
}

export function updateFormLayout(layoutElement: ILayoutComponent | ILayoutGroup, index: number): IUpdateFormLayout {
  return ({
    type: UPDATE_FORM_LAYOUT,
    layoutElement,
    index,
  });
}
