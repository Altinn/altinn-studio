import { ITextResourcesState } from '../features/appData/textResources/textResourcesSlice';
import { IAppDataState } from '../features/appData/appDataReducers';
import { IFormDesignerState } from '../features/formDesigner/formDesignerReducer';
import { layout1NameMock } from './layoutMock';
import { IAppState } from '../types/global';

export const textResourcesMock: ITextResourcesState = {
    currentEditId: undefined,
};

export const appDataMock: IAppDataState = {
    textResources: textResourcesMock,
};

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
    appData: appDataMock,
    formDesigner: formDesignerMock,
};