import { IAppState } from '../types/global';
import { appDataMock, appStateMock, textResourcesMock } from '../testing/mocks';
import { ITextResources } from '../features/appData/textResources/textResourcesSlice';
import { getAllTextResourceIdsWithTextSelector } from './textResourceSelectors';

describe('textResourceSelectors', () => {
  describe('getAllTextResourceIdsWithTextSelector', () => {
    it('Selects all text resource ids with corresponding text in the given language or an empty text if it does not exist in the given language', () => {
      const onlyNbId = 'onlyNbId';
      const onlyNbIdText = 'En tekst som bare finnes på norsk';
      const onlyEnId = 'onlyEnId';
      const onlyEnIdText = 'A text that only exists in English';
      const bothId = 'bothId';
      const bothIdTextNb = 'En tekst som finnes på begge språkene';
      const bothIdTextEn = 'A text that exists in both languages';
      const appState = mockAppStateWithTextResources({
        nb: [
          {
            id: onlyNbId,
            value: onlyNbIdText,
          },
          {
            id: bothId,
            value: bothIdTextNb,
          },
        ],
        en: [
          {
            id: onlyEnId,
            value: onlyEnIdText,
          },
          {
            id: bothId,
            value: bothIdTextEn,
          },
        ],
      });
      expect(getAllTextResourceIdsWithTextSelector('nb')(appState)).toEqual([
        {
          id: onlyNbId,
          value: onlyNbIdText,
        },
        {
          id: bothId,
          value: bothIdTextNb,
        },
        {
          id: onlyEnId,
          value: '',
        },
      ]);
    });
  });
});

const mockAppStateWithTextResources = (resources: ITextResources): IAppState => ({
  ...appStateMock,
  appData: {
    ...appDataMock,
    textResources: {
      ...textResourcesMock,
      resources,
    },
  },
});
