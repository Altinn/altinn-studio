import { useHandleUpdateTextResource } from './useHandleUpdateTextResource';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import type { TextResource } from '@studio/components-legacy';
import type { UpsertTextResourceMutation } from 'app-shared/hooks/mutations/useUpsertTextResourceMutation';

// Test data:
const language = 'nb';
const textResource: TextResource = { id: 'some-id', value: 'some-value' };
const updateTextResource = jest.fn();
const doReloadPreview = jest.fn();

describe('useHandleBlurTextResource', () => {
  beforeEach(jest.clearAllMocks);

  it('should call updateTextResource after updating textResource', () => {
    const { result } = renderHook(language, updateTextResource);
    result.current(textResource);

    expect(updateTextResource).toHaveBeenCalledTimes(1);
  });

  it('should call doReloadPreview if provided', () => {
    const textResource: TextResource = { id: 'some-id', value: 'some-value' };
    const { result } = renderHook(language, updateTextResource, doReloadPreview);
    result.current(textResource);

    expect(updateTextResource).toHaveBeenCalledTimes(1);
    expect(doReloadPreview).toHaveBeenCalledTimes(1);
  });
});

function renderHook(
  language: string,
  updateTextResource: (args: UpsertTextResourceMutation) => void,
  doReloadPreview?: () => void,
) {
  return renderHookWithProviders(() =>
    useHandleUpdateTextResource(language, updateTextResource, doReloadPreview),
  );
}
