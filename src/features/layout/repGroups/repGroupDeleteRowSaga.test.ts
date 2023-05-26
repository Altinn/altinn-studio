import { select, take } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { AttachmentActions } from 'src/features/attachments/attachmentSlice';
import { FormDynamicsActions } from 'src/features/dynamics/formDynamicsSlice';
import { FormDataActions } from 'src/features/formData/formDataSlice';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { repGroupDeleteRowSaga } from 'src/features/layout/repGroups/repGroupDeleteRowSaga';
import {
  selectAttachmentState,
  selectFormData,
  selectFormLayoutState,
  selectOptions,
  selectValidations,
} from 'src/features/layout/update/updateFormLayoutSagas';
import { OptionsActions } from 'src/features/options/optionsSlice';
import { ValidationActions } from 'src/features/validation/validationSlice';
import type { IAttachment } from 'src/features/attachments';
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
    const dataModelBinding: IDataModelBindings = {
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

    const attachment: IAttachment = {
      name: 'attachment.pdf',
      id: 'abc123',
      uploaded: true,
      deleting: false,
      size: 1234,
      tags: [],
      updating: false,
    };
    state.attachments.attachments = {
      'uploader-0': [attachment],
    };

    const action: Parameters<typeof repGroupDeleteRowSaga>[0] = {
      type: FormLayoutActions.repGroupDeleteRow.type,
      payload: {
        groupId: 'repeating-group',
        index: 0,
      },
    };

    return expectSaga(repGroupDeleteRowSaga, action)
      .provide([
        [select(selectFormLayoutState), selectFormLayoutState(state)],
        [select(selectFormData), selectFormData(state)],
        [select(selectAttachmentState), selectAttachmentState(state)],
        [select(selectValidations), selectValidations(state)],
        [select(selectOptions), selectOptions(state)],
        [
          take(AttachmentActions.deleteAttachmentFulfilled),
          AttachmentActions.deleteAttachmentFulfilled({
            componentId: 'uploader-0',
            attachmentType: 'uploader',
            attachmentId: 'abc123',
          }),
        ],
      ])
      .put(FormDynamicsActions.checkIfConditionalRulesShouldRun({}))
      .put(
        AttachmentActions.deleteAttachment({
          attachment,
          attachmentType: 'uploader',
          componentId: 'uploader-0',
          dataModelBindings: {},
        }),
      )
      .put(ValidationActions.updateValidations({ validations: {} }))
      .put(OptionsActions.setOptions({ options: {} }))
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
