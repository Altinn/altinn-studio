import { expectSaga, testSaga } from 'redux-saga-test-plan';
import { select } from 'redux-saga/effects';
import FormDataActions from 'src/features/form/data/formDataActions';
import { checkIfOptionsShouldRefetchSaga, fetchOptionsSaga, fetchSpecificOptionSaga, formDataSelector, formLayoutSelector, instanceIdSelector, optionsSelector, userLanguageSelector, watchCheckIfOptionsShouldRefetchSaga } from 'src/shared/resources/options/fetch/fetchOptionsSagas';
import type { IOptions, IRuntimeState } from 'src/types';
import * as networking from 'altinn-shared/utils/networking';
import type { IInstance } from 'altinn-shared/types';
import type { ILayouts, ISelectionComponentProps } from 'src/features/form/layout';


describe('shared > resources > options > fetch > fetchOptionsSagas', () => {
  describe('watchCheckIfOptionsShouldRefetchSaga', () => {
    it('should take every updateFormData action and spawn checkIfOptionsShouldRefetchSaga', () => {
      testSaga(watchCheckIfOptionsShouldRefetchSaga)
        .next()
        .takeEvery([
          FormDataActions.updateFormDataFulfilled,
          FormDataActions.updateFormDataSkipAutosave
        ], checkIfOptionsShouldRefetchSaga)
        .next()
        .isDone();
    });
  });

  describe('checkIfOptionsShouldRefetchSaga', () => {
    const userLanguage = 'nb';
    const action = {
      payload: {
        field: 'some_field',
        data: ''
      }, type: ''
    };
    const formData = {
      someField: 'someValue'
    };


    it('should refetch a given option when an updated field is in a option mapping', () => {
      jest.spyOn(networking, 'get').mockResolvedValue([]);
      const optionsWithField: IOptions = {
        someOption: {
          id: 'someOption',
          options: [],
          mapping: {
            some_field: 'some_url_parm'
          }
        }
      };
      return expectSaga(checkIfOptionsShouldRefetchSaga, action)
        .provide([
          [select(formDataSelector), formData],
          [select(userLanguageSelector), userLanguage],
          [select(optionsSelector), optionsWithField],
          [select(instanceIdSelector), 'someId']
        ])
        .fork(fetchSpecificOptionSaga, {
          optionsId: 'someOption',
          dataMapping: {
            some_field: 'some_url_parm'
          },
          secure: undefined
        })
        .run();
    });

    it('should do nothing when an updated field is not present in a option mapping', () => {
      const optionsWithoutField: IOptions = {
        someOption: {
          id: 'someOption',
          options: [],
          mapping: {
            some_other_field: 'some_url_parm'
          }
        }
      };
      return expectSaga(checkIfOptionsShouldRefetchSaga, action)
        .provide([
          [select(formDataSelector), formData],
          [select(userLanguageSelector), userLanguage],
          [select(optionsSelector), optionsWithoutField],
        ])
        .run();
    });
  });

  describe('fetchOptionsSaga', () => {
    it('should spawn fetchSpecificOptionSaga for each unique optionsId', () => {
      jest.spyOn(networking, 'get').mockResolvedValue([]);
      const formLayoutWithTwoSharedOptionIds: ILayouts = {
        formLayout: [
          {
            id: 'fylke',
            type: 'Dropdown',
            textResourceBindings: {
              'title': 'fylke'
            },
            dataModelBindings: {
              simpleBinding: 'FlytteFra.Fylke'
            },
            optionsId: 'fylke',
            required: true
          } as ISelectionComponentProps,
          {
            id: 'fylke-2',
            type: 'Dropdown',
            textResourceBindings: {
              title: 'fylke'
            },
            dataModelBindings: {
              simpleBinding: 'FlytteFra.Fylke'
            },
            optionsId: 'fylke',
            required: true
          } as ISelectionComponentProps,
          {
            id: 'kommune',
            type: 'Dropdown',
            textResourceBindings: {
              title: 'kommune'
            },
            dataModelBindings: {
              simpleBinding: 'FlytteFra.Kommune'
            },
            optionsId: 'kommune',
            required: true,
            mapping: {
              'FlytteFra.Fylke': 'fylke'
            }
          } as ISelectionComponentProps,
        ]
      };

      return expectSaga(fetchOptionsSaga)
        .provide([
          [select(formLayoutSelector), formLayoutWithTwoSharedOptionIds],
          [select(instanceIdSelector), 'someId']
        ])
        .fork(fetchSpecificOptionSaga, {
          optionsId: 'fylke',
          dataMapping: undefined,
          secure: undefined,

        })
        .fork(fetchSpecificOptionSaga, {
          optionsId: 'kommune',
          dataMapping: {
            'FlytteFra.Fylke': 'fylke'
          },
          secure: undefined,
        })
        .run();
    });


    it('should spawn multiple fetchSpecificOptionSaga if components have shared optionsId but different mapping', () => {
      jest.spyOn(networking, 'get').mockResolvedValue([]);
      const formLayoutWithSameOptionIdButDifferentMapping: ILayouts = {
        formLayout: [
          {
            id: 'kommune-1',
            type: 'Dropdown',
            textResourceBindings: {
              title: 'kommune'
            },
            dataModelBindings: {
              simpleBinding: 'FlytteFra.Kommune'
            },
            optionsId: 'kommune',
            required: true,
            mapping: {
              'FlytteFra.Fylke': 'fylke'
            }
          } as ISelectionComponentProps,
          {
            id: 'kommune-2',
            type: 'Dropdown',
            textResourceBindings: {
              title: 'kommune'
            },
            dataModelBindings: {
              simpleBinding: 'FlytteTil.Kommune'
            },
            optionsId: 'kommune',
            required: true,
            mapping: {
              'FlytteTil.Fylke': 'fylke'
            }
          } as ISelectionComponentProps,
        ]
      };

      return expectSaga(fetchOptionsSaga)
        .provide([
          [select(formLayoutSelector), formLayoutWithSameOptionIdButDifferentMapping],
          [select(instanceIdSelector), 'someId']
        ])
        .fork(fetchSpecificOptionSaga, {
          optionsId: 'kommune',
          dataMapping: {
            'FlytteFra.Fylke': 'fylke'
          },
          secure: undefined,
        })
        .fork(fetchSpecificOptionSaga, {
          optionsId: 'kommune',
          dataMapping: {
            'FlytteTil.Fylke': 'fylke'
          },
          secure: undefined,
        })
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
