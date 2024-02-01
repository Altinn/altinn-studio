import { renderHookWithMockStore } from '../../testing/mocks';
import { waitFor } from '@testing-library/react';
import { useWidgetsQuery } from './useWidgetsQuery';
import type { WidgetSettingsResponse } from 'app-shared/types/widgetTypes';
import type { IWidget } from '../../types/global';
import { ComponentType } from 'app-shared/types/ComponentType';

// Test data:
const org = 'org';
const app = 'app';
const widgetUrl1 = 'url1';
const widgetUrl2 = 'url2';
const widgetUrls = [widgetUrl1, widgetUrl2];
const widget1Name = ComponentType.Header;
const widget2Name = ComponentType.Paragraph;
const widget1: IWidget = { displayName: widget1Name, components: [], texts: [] };
const widget2: IWidget = { displayName: widget2Name, components: [], texts: [] };

// Mocks:
const widgetSettingsResponse: WidgetSettingsResponse = { widgetUrls };
const getWidgetSettings = jest.fn(() => Promise.resolve(widgetSettingsResponse));
jest.mock('app-shared/utils/networking', () => ({
  get: async (url: string) => {
    switch (url) {
      case widgetUrl1:
        return widget1;
      case widgetUrl2:
        return widget2;
    }
  },
}));

describe('useWidgetsQuery', () => {
  it('Calls getWidgetSettings with correct parameters', async () => {
    await render();
    expect(getWidgetSettings).toHaveBeenCalledTimes(1);
    expect(getWidgetSettings).toHaveBeenCalledWith(org, app);
  });

  it('Returns an array of requested widgets', async () => {
    const { result } = await render();
    expect(result.current.data).toEqual([widget1, widget2]);
  });
});

const render = async () => {
  const { renderHookResult } = renderHookWithMockStore(
    {},
    { getWidgetSettings },
  )(() => useWidgetsQuery(org, app));
  await waitFor(() => expect(renderHookResult.result.current.isSuccess).toBe(true));
  return renderHookResult;
};
