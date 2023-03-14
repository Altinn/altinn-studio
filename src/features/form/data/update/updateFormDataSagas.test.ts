import { select } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';
import type { PayloadAction } from '@reduxjs/toolkit';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { FormDataActions } from 'src/features/form/data/formDataSlice';
import {
  deleteAttachmentReferenceSaga,
  SelectAttachments,
  SelectFormData,
} from 'src/features/form/data/update/updateFormDataSagas';
import type { IDeleteAttachmentReference } from 'src/features/form/data/formDataTypes';
import type { IDataModelBindings } from 'src/layout/layout';
import type { IAttachment, IAttachments } from 'src/shared/resources/attachments';
import type { IRuntimeState } from 'src/types';

describe('updateFormDataSagas', () => {
  const testDeleteAttachmentReferenceSaga =
    (
      formDataBefore: any,
      formDataAfter: any,
      attachmentState: IAttachments,
      componentId: string,
      dataBinding: IDataModelBindings,
    ) =>
    () => {
      const state: IRuntimeState = getInitialStateMock();
      state.formData.formData = {
        SomethingElse: 'value',
        ...formDataBefore,
      };
      state.attachments.attachments = attachmentState;

      const expectedUpdatedFormData = {
        SomethingElse: 'value',
        ...formDataAfter,
      };

      const action: PayloadAction<IDeleteAttachmentReference> = {
        type: FormDataActions.deleteAttachmentReference.type,
        payload: {
          attachmentId: 'abc123',
          componentId,
          dataModelBindings: dataBinding,
        },
      };

      return expectSaga(deleteAttachmentReferenceSaga, action)
        .provide([
          [select(SelectFormData), SelectFormData(state)],
          [select(SelectAttachments), SelectAttachments(state)],
        ])
        .put(
          FormDataActions.setFulfilled({
            formData: expectedUpdatedFormData,
          }),
        )
        .put(FormDataActions.save({ componentId }))
        .run();
    };

  const makeAttachment = (id: string): IAttachment => ({
    id,
    uploaded: true,
    deleting: false,
    size: 1234,
    tags: [],
    updating: false,
    name: 'someFile.pdf',
  });

  it(
    'deleteAttachmentReferenceSaga works for simple components',
    testDeleteAttachmentReferenceSaga(
      { MyAttachment: 'abc123' },
      {},
      { component1: [makeAttachment('abc123')] },
      'component1',
      { simpleBinding: 'MyAttachment' },
    ),
  );

  it(
    'deleteAttachmentReferenceSaga works for list binding',
    testDeleteAttachmentReferenceSaga(
      { 'MyAttachment[0]': 'abc123', 'MyAttachment[1]': 'def456' },
      { 'MyAttachment[0]': 'def456' },
      { component1: [makeAttachment('abc123'), makeAttachment('def456')] },
      'component1',
      { list: 'MyAttachment' },
    ),
  );

  it(
    'deleteAttachmentReferenceSaga works for list binding in repeating group',
    testDeleteAttachmentReferenceSaga(
      {
        'Group[0].MyAttachment[0]': 'abc123',
        'Group[0].MyAttachment[1]': 'def456',
      },
      { 'Group[0].MyAttachment[0]': 'def456' },
      { 'component1-0': [makeAttachment('abc123'), makeAttachment('def456')] },
      'component1-0',
      { list: 'Group[0].MyAttachment' },
    ),
  );
});
