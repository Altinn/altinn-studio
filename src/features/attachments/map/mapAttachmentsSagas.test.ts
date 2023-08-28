import { select } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { AttachmentActions } from 'src/features/attachments/attachmentSlice';
import {
  mapAttachments,
  SelectApplicationMetaData,
  SelectFormData,
  SelectFormLayouts,
  SelectFormLayoutSets,
  SelectInstance,
  SelectInstanceData,
} from 'src/features/attachments/map/mapAttachmentsSagas';
import { selectFormLayouts } from 'src/features/layout/update/updateFormLayoutSagas';
import type { IAttachment, IAttachments } from 'src/features/attachments';
import type { CompFileUploadExternal } from 'src/layout/FileUpload/config.generated';
import type { CompGroupRepeatingExternal } from 'src/layout/Group/config.generated';

type MakeOptional = 'displayMode' | 'maxFileSizeInMB' | 'minNumberOfAttachments' | 'maxNumberOfAttachments';
type BasicComp = Omit<CompFileUploadExternal, MakeOptional> & Partial<Pick<CompFileUploadExternal, MakeOptional>>;

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
    const basicUploader: BasicComp = {
      id: 'upload-outside-group',
      type: 'FileUpload',
      textResourceBindings: {},
    };
    const basicUploaderWithBindings: BasicComp = {
      id: 'upload-outside-group-with-bindings',
      type: 'FileUpload',
      dataModelBindings: {
        list: 'Outside.AttachmentsWithBindings',
      },
      textResourceBindings: {},
      maxNumberOfAttachments: 5,
    };
    const uploaderInRepeatingGroup: BasicComp = {
      id: 'upload-in-repeating-group',
      type: 'FileUpload',
      dataModelBindings: {
        simpleBinding: 'Group.SingleAttachment',
      },
      textResourceBindings: {},
    };
    const multiUploaderInRepeatingGroup: BasicComp = {
      id: 'multi-upload-in-repeating-group',
      type: 'FileUpload',
      dataModelBindings: {
        list: 'Group.MultiAttachment',
      },
      textResourceBindings: {},
      maxNumberOfAttachments: 5,
    };
    const repeatingGroup: CompGroupRepeatingExternal = {
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
        basicUploader as CompFileUploadExternal,
        basicUploaderWithBindings as CompFileUploadExternal,
        repeatingGroup,
        uploaderInRepeatingGroup as CompFileUploadExternal,
        multiUploaderInRepeatingGroup as CompFileUploadExternal,
      ],
    };

    const mockedAttachments = [0, 1, 2, 3, 4].map((i) => mockAttachment(`attachment${i}`));

    const expected: IAttachments = {
      [basicUploader.id]: [mockedAttachments[0]],
      [basicUploaderWithBindings.id]: [mockedAttachments[1]],
      [`${uploaderInRepeatingGroup.id}-0`]: [mockedAttachments[2]],
      [`${multiUploaderInRepeatingGroup.id}-0`]: [mockedAttachments[3], mockedAttachments[4]],
    };

    state.formData.formData = {
      'Outside.AttachmentsWithBindings[0]': mockedAttachments[1].id,
      'Group[0].SingleAttachment': mockedAttachments[2].id,
      'Group[0].MultiAttachment[0]': mockedAttachments[3].id,
      'Group[0].MultiAttachment[1]': mockedAttachments[4].id,
    };

    state.instanceData.instance?.data.push(
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
