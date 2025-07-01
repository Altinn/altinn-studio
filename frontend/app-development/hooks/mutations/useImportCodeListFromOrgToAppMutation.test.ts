import {
  useImportCodeListFromOrgToAppMutation,
  convertTextResourceResponseToCacheFormat,
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

  describe('convertTextResourceResponseToCacheFormat', () => {
    const textResourcesNorwegian: ITextResource[] = [{ id: 'some-id', value: 'en-verdi' }];
    const textResourcesEnglish: ITextResource[] = [{ id: 'some-id', value: 'some-value' }];
    const languageCodeNorwegian = 'nb';
    const languageCodeEnglish = 'en';
    const initialTexts: Record<string, ITextResourcesWithLanguage> = {
      [languageCodeNorwegian]: {
        language: languageCodeNorwegian,
        resources: textResourcesNorwegian,
      },
      [languageCodeEnglish]: { language: languageCodeEnglish, resources: textResourcesEnglish },
    };

    it('should return convert textResources to correct format', () => {
      const result = convertTextResourceResponseToCacheFormat(initialTexts);
      expect(result[languageCodeNorwegian]).toBe(textResourcesNorwegian);
      expect(result[languageCodeEnglish]).toBe(textResourcesEnglish);
    });

    it('should return null if text is undefined', () => {
      const result = convertTextResourceResponseToCacheFormat(undefined);
      expect(result).toBeNull();
    });
  });
});
