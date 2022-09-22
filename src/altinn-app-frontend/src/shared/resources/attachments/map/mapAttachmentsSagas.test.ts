import { getInitialStateMock } from '__mocks__/mocks';
import { select } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';

import { selectFormLayouts } from 'src/features/form/layout/update/updateFormLayoutSagas';
import { AttachmentActions } from 'src/shared/resources/attachments/attachmentSlice';
import {
  mapAttachments,
  SelectApplicationMetaData,
  SelectFormData,
  SelectFormLayouts,
  SelectFormLayoutSets,
  SelectInstance,
  SelectInstanceData,
} from 'src/shared/resources/attachments/map/mapAttachmentsSagas';
import type {
  ILayoutCompFileUpload,
  ILayoutComponent,
  ILayoutGroup,
} from 'src/features/form/layout';
import type {
  IAttachment,
  IAttachments,
} from 'src/shared/resources/attachments';

describe('mapAttachments', () => {
  const defaultAttachmentProps = {
    tags: [],
    uploaded: true,
    size: 1234,
    updating: false,
    deleting: false,
  };
  const defaultDataTypeProps = {
    ...defaultAttachmentProps,
    blobStoragePath: 'test',
    locked: false,
    instanceGuid: 'test',
    contentType: 'image/jpeg',
    refs: [],
    created: new Date(),
    createdBy: 'user',
    lastChanged: new Date(),
    lastChangedBy: 'user',
  };

  const mockAttachment = (id: string): IAttachment => ({
    name: 'song.mp3',
    id,
    ...defaultAttachmentProps,
  });

  const mockInstanceData = (attachment: IAttachment, component: any): any => ({
    filename: attachment.name,
    ...attachment,
    ...defaultDataTypeProps,
    dataType: component.id,
  });

  it('should map attachments to repeating group rows', () => {
    const state = getInitialStateMock();
    const basicUploader = {
      id: 'upload-outside-group',
      type: 'FileUpload',
      dataModelBindings: {},
      textResourceBindings: {},
    } as ILayoutCompFileUpload;
    const basicUploaderWithBindings = {
      id: 'upload-outside-group-with-bindings',
      type: 'FileUpload',
      dataModelBindings: {
        list: 'Outside.AttachmentsWithBindings',
      },
      textResourceBindings: {},
      maxNumberOfAttachments: 5,
    };
    const uploaderInRepeatingGroup = {
      id: 'upload-in-repeating-group',
      type: 'FileUpload',
      dataModelBindings: {
        simpleBinding: 'Group.SingleAttachment',
      },
      textResourceBindings: {},
    } as ILayoutCompFileUpload;
    const multiUploaderInRepeatingGroup = {
      id: 'multi-upload-in-repeating-group',
      type: 'FileUpload',
      dataModelBindings: {
        list: 'Group.MultiAttachment',
      },
      textResourceBindings: {},
      maxNumberOfAttachments: 5,
    };
    const repeatingGroup: ILayoutGroup = {
      id: 'repeating-group',
      type: 'Group',
      dataModelBindings: {
        group: 'Group',
      },
      textResourceBindings: {},
      maxCount: 3,
      children: [uploaderInRepeatingGroup.id, multiUploaderInRepeatingGroup.id],
    };

    state.formLayout.layouts = {
      FormLayout: [
        basicUploader,
        basicUploaderWithBindings as ILayoutComponent,
        repeatingGroup,
        uploaderInRepeatingGroup,
        multiUploaderInRepeatingGroup as ILayoutComponent,
      ],
    };

    const mockedAttachments = [0, 1, 2, 3, 4].map((i) =>
      mockAttachment(`attachment${i}`),
    );

    const expected: IAttachments = {
      [basicUploader.id]: [mockedAttachments[0]],
      [basicUploaderWithBindings.id]: [mockedAttachments[1]],
      [`${uploaderInRepeatingGroup.id}-0`]: [mockedAttachments[2]],
      [`${multiUploaderInRepeatingGroup.id}-0`]: [
        mockedAttachments[3],
        mockedAttachments[4],
      ],
    };

    state.formData.formData = {
      'Outside.AttachmentsWithBindings[0]': mockedAttachments[1].id,
      'Group[0].SingleAttachment': mockedAttachments[2].id,
      'Group[0].MultiAttachment[0]': mockedAttachments[3].id,
      'Group[0].MultiAttachment[1]': mockedAttachments[4].id,
    };

    state.instanceData.instance.data.push(
      mockInstanceData(mockedAttachments[0], basicUploader),
      mockInstanceData(mockedAttachments[1], basicUploaderWithBindings),
      mockInstanceData(mockedAttachments[2], uploaderInRepeatingGroup),
      mockInstanceData(mockedAttachments[3], multiUploaderInRepeatingGroup),
      mockInstanceData(mockedAttachments[4], multiUploaderInRepeatingGroup),
    );

    return expectSaga(mapAttachments)
      .provide([
        [select(SelectInstanceData), SelectInstanceData(state)],
        [select(SelectInstance), SelectInstance(state)],
        [select(SelectApplicationMetaData), SelectApplicationMetaData(state)],
        [select(SelectFormLayoutSets), SelectFormLayoutSets(state)],
        [select(SelectFormData), SelectFormData(state)],
        [select(SelectFormLayouts), selectFormLayouts(state)],
      ])
      .put(AttachmentActions.mapAttachmentsFulfilled({ attachments: expected }))
      .run();
  });
});
