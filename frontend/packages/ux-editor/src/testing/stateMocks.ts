import type { IFormDesignerState } from '../features/formDesigner/formDesignerReducer';
import { layout1NameMock } from './layoutMock';
import type { IAppState } from '../types/global';

export const formDesignerMock: IFormDesignerState = {
  layout: {
    error: null,
    saving: false,
    unSavedChanges: false,
    selectedLayoutSet: 'test-layout-set',
    selectedLayout: layout1NameMock,
    invalidLayouts: [],
  },
};

export const appStateMock: IAppState = {
  formDesigner: formDesignerMock,
};
