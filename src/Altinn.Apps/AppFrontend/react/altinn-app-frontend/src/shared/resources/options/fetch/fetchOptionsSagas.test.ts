import { expectSaga, testSaga } from 'redux-saga-test-plan';
import { select } from 'redux-saga/effects';
import FormDataActions from 'src/features/form/data/formDataActions';
import { checkIfOptionsShouldRefetchSaga, fetchSpecificOptionSaga, formDataSelector, instanceIdSelector, optionsSelector, userLanguageSelector, watchCheckIfOptionsShouldRefetchSaga } from 'src/shared/resources/options/fetch/fetchOptionsSagas';
import { IOptions, IRuntimeState } from 'src/types';
import * as networking from 'altinn-shared/utils/networking';
import { IInstance } from 'altinn-shared/types';


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
