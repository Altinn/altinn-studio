import { select } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { repGroupDeleteRowSaga } from 'src/features/form/layout/repGroups/repGroupDeleteRowSaga';
import { selectFormData, selectFormLayoutState } from 'src/features/form/layout/update/updateFormLayoutSagas';
import { FormDataActions } from 'src/features/formData/formDataSlice';
import { ValidationActions } from 'src/features/validation/validationSlice';
import { resolvedLayoutsFromState, ResolvedNodesSelector } from 'src/utils/layout/hierarchy';
import type { IDataModelBindings } from 'src/layout/layout';
import type { IRuntimeState } from 'src/types';

describe('repGroupDeleteRowSaga', function () {
  it('should remove attachment references from formData', () => {
    const state: IRuntimeState = getInitialStateMock();
    state.formLayout.layouts?.FormLayout?.push({
      id: 'repeating-group',
      type: 'Group',
      dataModelBindings: {
        group: 'Group',
      },
      textResourceBindings: {},
      maxCount: 3,
      children: ['uploader'],
    });
    state.formLayout.uiConfig.repeatingGroups = {
      'repeating-group': {
        index: 0,
        editIndex: -1,
        dataModelBinding: 'Group',
      },
    };
    const dataModelBinding: IDataModelBindings<'FileUpload' | 'FileUploadWithTag'> = {
      simpleBinding: 'Group.attachmentRef',
    };
    state.formLayout.layouts?.FormLayout?.push({
      id: 'uploader',
      type: 'FileUpload',
      dataModelBindings: dataModelBinding,
      textResourceBindings: {},
      minNumberOfAttachments: 1,
      maxNumberOfAttachments: 15,
      maxFileSizeInMB: 15,
      displayMode: 'simple',
    });

    const initialFormData = { ...state.formData.formData };
    state.formData.formData['Group[0].attachmentRef'] = 'abc123';

    const action: Parameters<typeof repGroupDeleteRowSaga>[0] = {
      type: FormLayoutActions.repGroupDeleteRow.type,
      payload: {
        groupId: 'repeating-group',
        index: 0,
        currentPageId: 'FormLayout',
      },
    };

    return expectSaga(repGroupDeleteRowSaga, action)
      .provide([
        [select(selectFormLayoutState), selectFormLayoutState(state)],
        [select(selectFormData), selectFormData(state)],
        [select(ResolvedNodesSelector), resolvedLayoutsFromState(state)],
      ])
      .put(
        ValidationActions.updateLayoutValidation({
          pageKey: 'FormLayout',
          validationResult: {
            validations: { 'uploader-0': {} },
            invalidDataTypes: false,
            fixedValidations: [],
          },
          merge: true,
        }),
      )
      .put(
        FormLayoutActions.repGroupDeleteRowFulfilled({
          updated: {
            'repeating-group': {
              index: -1,
              editIndex: -1,
              deletingIndex: undefined,
              dataModelBinding: 'Group',
            },
          },
        }),
      )
      .put(FormDataActions.setFulfilled({ formData: initialFormData }))
      .put(FormDataActions.saveEvery({}))
      .run();
  });
});
