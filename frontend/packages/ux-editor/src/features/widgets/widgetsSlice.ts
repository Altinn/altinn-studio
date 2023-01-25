import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { IWidget } from '../../types/global';
import { widgetUrl } from 'app-shared/cdn-paths';

export interface IWidgetState {
  widgets: IWidget[];
  urls: string[];
  error: any;
}

export interface IFetchWidgetFulfilled {
  widgets: IWidget[];
}

const initialState: IWidgetState = {
  widgets: [],
  urls: [widgetUrl()],
  error: null,
};

const widgetsSlice = createSlice({
  name: 'widgets',
  initialState,
  reducers: {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    fetchWidgets: () => {},
    fetchWidgetsFulfilled: (state, action: PayloadAction<IFetchWidgetFulfilled>) => {
      const { widgets } = action.payload;
      state.widgets = widgets;
      state.error = null;
    },
    fetchWidgetsRejected: (state, action) => {
      const { error } = action.payload;
      state.error = error;
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    fetchWidgetSettings: () => {},
    fetchWidgetSettingsFulfilled: (state, action) => {
      const { widgetUrls } = action.payload;
      state.urls = state.urls.concat(widgetUrls);
    },
    fetchWidgetSettingsRejected: (state, action) => {
      const { error } = action.payload;
      state.error = error;
    },
  },
});

export const {
  fetchWidgets,
  fetchWidgetsFulfilled,
  fetchWidgetsRejected,
  fetchWidgetSettings,
  fetchWidgetSettingsFulfilled,
  fetchWidgetSettingsRejected,
} = widgetsSlice.actions;

export default widgetsSlice.reducer;
