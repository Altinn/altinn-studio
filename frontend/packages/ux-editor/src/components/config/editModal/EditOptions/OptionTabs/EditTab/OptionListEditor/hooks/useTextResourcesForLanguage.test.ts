import { useTextResourcesForLanguage } from './useTextResourcesForLanguage';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import type { TextResource } from '@studio/components';
import type { TextResources } from '@studio/content-library';

// Test data:
const language = 'nb';

describe('useTextResourcesForLanguage', () => {
  beforeEach(jest.clearAllMocks);

  it('should call updateTextResource after updating textResource', () => {
    const textResource: TextResource = { id: 'some-id', value: 'some-value' };
    const textResources: TextResources = { [language]: [textResource] };
    const { result } = renderHook(language, textResources);
    const temp: TextResource[] = result.current;

    expect(temp).toEqual([textResource]);
  });

  it('should call doReloadPreview if provided', () => {
    const emptyTextResource: TextResources = {};
    const { result } = renderHook(language, emptyTextResource);
    const temp: TextResource[] = result.current;

    expect(temp).toEqual(undefined);
  });
});

function renderHook(language: string, updateTextResource: TextResources) {
  return renderHookWithProviders(() => useTextResourcesForLanguage(language, updateTextResource));
}
