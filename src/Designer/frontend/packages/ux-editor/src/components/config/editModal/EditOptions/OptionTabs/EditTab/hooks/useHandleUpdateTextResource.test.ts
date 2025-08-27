import { useHandleUpdateTextResource } from './useHandleUpdateTextResource';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import type { TextResource } from 'libs/studio-components-legacy/src';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { waitFor } from '@testing-library/react';

// Test data:
const language = 'nb';
const textResource: TextResource = { id: 'some-id', value: 'some-value' };
const doReloadPreview = jest.fn();

describe('useHandleUpdateTextResource', () => {
  beforeEach(jest.clearAllMocks);

  it('should call updateTextResource after updating textResource', async () => {
    const { result } = renderHook(language);
    result.current(textResource);

    await waitFor(() => expect(queriesMock.upsertTextResources).toHaveBeenCalledTimes(1));
  });

  it('should call doReloadPreview if provided', async () => {
    const textResource: TextResource = { id: 'some-id', value: 'some-value' };
    const { result } = renderHook(language, doReloadPreview);
    result.current(textResource);

    await waitFor(() => expect(queriesMock.upsertTextResources).toHaveBeenCalledTimes(1));
    expect(doReloadPreview).toHaveBeenCalledTimes(1);
  });
});

function renderHook(language: string, doReloadPreview?: () => void) {
  return renderHookWithProviders(() => useHandleUpdateTextResource(language, doReloadPreview));
}
