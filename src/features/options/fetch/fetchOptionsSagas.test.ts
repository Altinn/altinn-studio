import { select } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';

import {
  checkIfOptionsShouldRefetchSaga,
  fetchOptionsSaga,
  fetchSpecificOptionSaga,
  formDataSelector,
  formLayoutSelector,
  instanceIdSelector,
  optionsSelector,
  optionsWithIndexIndicatorsSelector,
  repeatingGroupsSelector,
} from 'src/features/options/fetch/fetchOptionsSagas';
import { staticUseLanguageForTests, staticUseLanguageFromState } from 'src/hooks/useLanguage';
import * as networking from 'src/utils/network/sharedNetworking';
import { selectNotNull } from 'src/utils/sagas';
import type { ILayouts } from 'src/layout/layout';
import type { IOptions, IRuntimeState } from 'src/types';
import type { IInstance } from 'src/types/shared';

describe('fetchOptionsSagas', () => {
  describe('checkIfOptionsShouldRefetchSaga', () => {
    const userLanguage = 'nb';
    const action = {
      payload: {
        field: 'some_field',
        componentId: 'some_component',
        data: '',
      },
      type: '',
    };
    const formData = {
      someField: 'someValue',
    };

    it('should refetch a given option when an updated field is in a option mapping', () => {
      jest.spyOn(networking, 'httpGet').mockResolvedValue([]);
      const optionsWithField: IOptions = {
        someOption: {
          id: 'someOption',
          options: [],
          mapping: {
            some_field: 'some_url_parm',
          },
        },
      };
      return expectSaga(checkIfOptionsShouldRefetchSaga, action)
        .provide([
          [select(formDataSelector), formData],
          [select(staticUseLanguageFromState), staticUseLanguageForTests({ selectedAppLanguage: userLanguage })],
          [select(optionsSelector), optionsWithField],
          [select(optionsWithIndexIndicatorsSelector), []],
          [select(instanceIdSelector), 'someId'],
        ])
        .fork(fetchSpecificOptionSaga, {
          optionsId: 'someOption',
          dataMapping: {
            some_field: 'some_url_parm',
          },
          fixedQueryParameters: undefined,
          secure: undefined,
        })
        .run();
    });

    it('should do nothing when an updated field is not present in a option mapping', () => {
      const optionsWithoutField: IOptions = {
        someOption: {
          id: 'someOption',
          options: [],
          mapping: {
            some_other_field: 'some_url_parm',
          },
        },
      };
      return expectSaga(checkIfOptionsShouldRefetchSaga, action)
        .provide([
          [select(formDataSelector), formData],
          [select(staticUseLanguageFromState), staticUseLanguageForTests({ selectedAppLanguage: userLanguage })],
          [select(optionsSelector), optionsWithoutField],
          [select(optionsWithIndexIndicatorsSelector), []],
        ])
        .run();
    });
  });

  describe('fetchOptionsSaga', () => {
    it('should spawn fetchSpecificOptionSaga for each unique optionsId', () => {
      jest.spyOn(networking, 'httpGet').mockResolvedValue([]);
      const formLayoutWithTwoSharedOptionIds: ILayouts = {
        formLayout: [
          {
            id: 'fylke',
            type: 'Dropdown',
            textResourceBindings: {
              title: 'fylke',
            },
            dataModelBindings: {
              simpleBinding: 'FlytteFra.Fylke',
            },
            optionsId: 'fylke',
            required: true,
          },
          {
            id: 'fylke-2',
            type: 'Dropdown',
            textResourceBindings: {
              title: 'fylke',
            },
            dataModelBindings: {
              simpleBinding: 'FlytteFra.Fylke',
            },
            optionsId: 'fylke',
            required: true,
          },
          {
            id: 'kommune',
            type: 'Dropdown',
            textResourceBindings: {
              title: 'kommune',
            },
            dataModelBindings: {
              simpleBinding: 'FlytteFra.Kommune',
            },
            optionsId: 'kommune',
            required: true,
            mapping: {
              'FlytteFra.Fylke': 'fylke',
            },
          },
        ],
      };

      return expectSaga(fetchOptionsSaga)
        .provide([
          [selectNotNull(formLayoutSelector), formLayoutWithTwoSharedOptionIds],
          [selectNotNull(repeatingGroupsSelector), {}],
          [select(instanceIdSelector), 'someId'],
        ])
        .fork(fetchSpecificOptionSaga, {
          optionsId: 'fylke',
          dataMapping: undefined,
          fixedQueryParameters: undefined,
          secure: undefined,
        })
        .fork(fetchSpecificOptionSaga, {
          optionsId: 'kommune',
          dataMapping: {
            'FlytteFra.Fylke': 'fylke',
          },
          fixedQueryParameters: undefined,
          secure: undefined,
        })
        .run();
    });

    it('should spawn multiple fetchSpecificOptionSaga if components have shared optionsId but different mapping', () => {
      jest.spyOn(networking, 'httpGet').mockResolvedValue([]);
      const formLayoutWithSameOptionIdButDifferentMapping: ILayouts = {
        formLayout: [
          {
            id: 'kommune-1',
            type: 'Dropdown',
            textResourceBindings: {
              title: 'kommune',
            },
            dataModelBindings: {
              simpleBinding: 'FlytteFra.Kommune',
            },
            optionsId: 'kommune',
            required: true,
            mapping: {
              'FlytteFra.Fylke': 'fylke',
            },
          },
          {
            id: 'kommune-2',
            type: 'Dropdown',
            textResourceBindings: {
              title: 'kommune',
            },
            dataModelBindings: {
              simpleBinding: 'FlytteTil.Kommune',
            },
            optionsId: 'kommune',
            required: true,
            mapping: {
              'FlytteTil.Fylke': 'fylke',
            },
          },
        ],
      };

      return expectSaga(fetchOptionsSaga)
        .provide([
          [selectNotNull(formLayoutSelector), formLayoutWithSameOptionIdButDifferentMapping],
          [selectNotNull(repeatingGroupsSelector), {}],
          [select(instanceIdSelector), 'someId'],
        ])
        .fork(fetchSpecificOptionSaga, {
          optionsId: 'kommune',
          dataMapping: {
            'FlytteFra.Fylke': 'fylke',
          },
          fixedQueryParameters: undefined,
          secure: undefined,
        })
        .fork(fetchSpecificOptionSaga, {
          optionsId: 'kommune',
          dataMapping: {
            'FlytteTil.Fylke': 'fylke',
          },
          fixedQueryParameters: undefined,
          secure: undefined,
        })
        .run();
    });
  });

  describe('Fixed query parameters', () => {
    it('should include static query parameters and mapping', () => {
      jest.spyOn(networking, 'httpGet').mockResolvedValue([]);
      const formLayout: ILayouts = {
        formLayout: [
          {
            id: 'fylke',
            type: 'Dropdown',
            textResourceBindings: {
              title: 'fylke',
            },
            dataModelBindings: {
              simpleBinding: 'FlytteFra.Fylke',
            },
            optionsId: 'fylke',
            required: true,
            queryParameters: {
              level: '1',
            },
          },
          {
            id: 'kommune',
            type: 'Dropdown',
            textResourceBindings: {
              title: 'kommune',
            },
            dataModelBindings: {
              simpleBinding: 'FlytteTil.Kommune',
            },
            optionsId: 'kommune',
            required: true,
            mapping: {
              'FlytteTil.Fylke': 'fylke',
            },
            queryParameters: {
              level: '2',
            },
          },
        ],
      };

      return expectSaga(fetchOptionsSaga)
        .provide([
          [selectNotNull(formLayoutSelector), formLayout],
          [selectNotNull(repeatingGroupsSelector), {}],
          [select(instanceIdSelector), 'someId'],
        ])
        .fork(fetchSpecificOptionSaga, {
          optionsId: 'fylke',
          dataMapping: undefined,
          fixedQueryParameters: { level: '1' },
          secure: undefined,
        })
        .fork(fetchSpecificOptionSaga, {
          optionsId: 'kommune',
          dataMapping: {
            'FlytteTil.Fylke': 'fylke',
          },
          fixedQueryParameters: { level: '2' },
          secure: undefined,
        })
        .run();
    });

    it('should include static query parameters in url', () => {
      jest.spyOn(networking, 'httpGet').mockResolvedValue([]);

      const formData = {
        'FlytteTil.Fylke': 'Oslo',
      };

      return expectSaga(fetchSpecificOptionSaga, {
        optionsId: 'kommune',
        dataMapping: undefined,
        fixedQueryParameters: { level: '1' },
        secure: undefined,
      })
        .provide([
          [select(formDataSelector), formData],
          [select(staticUseLanguageFromState), { selectedLanguage: 'nb' }],
          [select(instanceIdSelector), 'someId'],
        ])
        .call(networking.httpGet, 'https://local.altinn.cloud/ttd/test/api/options/kommune?language=nb&level=1')
        .run();
    });

    it('should include mapping in url', () => {
      jest.spyOn(networking, 'httpGet').mockResolvedValue([]);

      const formData = {
        'FlytteTil.Fylke': 'Oslo',
      };

      return expectSaga(fetchSpecificOptionSaga, {
        optionsId: 'kommune',
        dataMapping: {
          'FlytteTil.Fylke': 'fylke',
        },
        fixedQueryParameters: undefined,
        secure: undefined,
      })
        .provide([
          [select(formDataSelector), formData],
          [select(staticUseLanguageFromState), { selectedLanguage: 'nb' }],
          [select(instanceIdSelector), 'someId'],
        ])
        .call(networking.httpGet, 'https://local.altinn.cloud/ttd/test/api/options/kommune?language=nb&fylke=Oslo')
        .run();
    });

    it('should include static query parameters and mapping in request url', () => {
      jest.spyOn(networking, 'httpGet').mockResolvedValue([]);

      const formData = {
        'FlytteTil.Fylke': 'Oslo',
      };

      return expectSaga(fetchSpecificOptionSaga, {
        optionsId: 'kommune',
        dataMapping: {
          'FlytteTil.Fylke': 'fylke',
        },
        fixedQueryParameters: { level: '1' },
        secure: undefined,
      })
        .provide([
          [select(formDataSelector), formData],
          [select(staticUseLanguageFromState), { selectedLanguage: 'nb' }],
          [select(instanceIdSelector), 'someId'],
        ])
        .call(
          networking.httpGet,
          'https://local.altinn.cloud/ttd/test/api/options/kommune?language=nb&level=1&fylke=Oslo',
        )
        .run();
    });
  });

  describe('instanceIdSelector', () => {
    it('should return instance id if present', () => {
      const state = {
        instanceData: {
          instance: {
            id: 'someId',
          } as IInstance,
          error: null,
        },
      } as IRuntimeState;
      const result = instanceIdSelector(state);

      expect(result).toEqual('someId');
    });

    it('should return undefined if instance is not present', () => {
      const result = instanceIdSelector({
        instanceData: {},
      } as IRuntimeState);

      expect(result).toEqual(undefined);
    });
  });
});
