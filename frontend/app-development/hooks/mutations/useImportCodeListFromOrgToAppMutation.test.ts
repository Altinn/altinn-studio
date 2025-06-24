import {
  useImportCodeListFromOrgToAppMutation,
  extractTexts,
} from './useImportCodeListFromOrgToAppMutation';
import { renderHookWithProviders } from 'app-shared/mocks/renderHookWithProviders';
import { org, app } from '@studio/testing/testids';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { ITextResource, ITextResourcesWithLanguage } from 'app-shared/types/global';

describe('useImportCodeListFromOrgToAppMutation', () => {
  beforeEach(jest.clearAllMocks);
  const codeListId: string = 'testCodeListId';

  it('should call importCodeListFromOrgToApp with correct parameters', async () => {
    const { result } = renderHookWithProviders(() =>
      useImportCodeListFromOrgToAppMutation(org, app),
    );
    await result.current.mutateAsync(codeListId);
    expect(queriesMock.importCodeListFromOrgToApp).toHaveBeenCalledTimes(1);
    expect(queriesMock.importCodeListFromOrgToApp).toHaveBeenCalledWith(org, app, codeListId);
  });

  describe('extractTexts', () => {
    const textResources: ITextResource[] = [{ id: 'some-id', value: 'some-value' }];
    const languageCodeNorwegian = 'nb';
    const languageCodeEnglish = 'en';
    const initialTexts: Record<string, ITextResourcesWithLanguage> = {
      nb: { language: languageCodeNorwegian, resources: textResources },
      en: { language: languageCodeEnglish, resources: textResources },
    };

    it('should return updated textResources', () => {
      const result = extractTexts(initialTexts);
      expect(result[languageCodeNorwegian]).toBe(textResources);
      expect(result[languageCodeEnglish]).toBe(textResources);
    });

    it('should return null if text is undefined', () => {
      const result = extractTexts(undefined);
      expect(result).toBeNull();
    });
  });
});
