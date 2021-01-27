import { ActionCreatorWithPayload, createAction } from '@reduxjs/toolkit';

export interface IAddWidgetAction {
  widget: IWidget;
  position: number;
  containerId?: string;
}

export interface IAddWidgetActionFulfilled {
  components: IFormComponent[];
  position: number;
  containerId?: string;
  layoutId: string;
  containerOrder: string[];
}

export interface IAddWidgetActionRejected{
  error: Error;
}

export const addWidget: ActionCreatorWithPayload<IAddWidgetAction, string> = createAction<IAddWidgetAction>('formLayout/addWidget');
export const addWidgetFulfilled = createAction<IAddWidgetActionFulfilled>('formLayout/addWidgetFulfilled');
export const addWidgetRejected = createAction<IAddWidgetActionRejected>('formLayout/addWidgetRejected');
