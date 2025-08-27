import { useTextResourcesForLanguage } from './useTextResourcesForLanguage';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import type { TextResource } from 'libs/studio-components-legacy/src';
import type { TextResources } from 'libs/studio-content-library/src';

// Test data:
const language = 'nb';

describe('useTextResourcesForLanguage', () => {
  beforeEach(jest.clearAllMocks);

  it('should return the text resources for the specified language', () => {
    const textResource: TextResource = { id: 'some-id', value: 'some-value' };
    const textResources: TextResources = { [language]: [textResource] };
    const { result } = renderHook(language, textResources);
    const actualTextResource: TextResource[] = result.current;

    expect(actualTextResource).toEqual([textResource]);
  });

  it('should return undefined when empty text resources', () => {
    const emptyTextResource: TextResources = {};
    const { result } = renderHook(language, emptyTextResource);
    const actualTextResource: TextResource[] = result.current;

    expect(actualTextResource).toEqual(undefined);
  });
});

function renderHook(language: string, textResource: TextResources) {
  return renderHookWithProviders(() => useTextResourcesForLanguage(language, textResource));
}
