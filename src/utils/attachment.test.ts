import { getFileEnding, removeFileEnding, shiftAttachmentRowInRepeatingGroup } from 'src/utils/attachment';
import type { IAttachment, IAttachments } from 'src/features/attachments';
import type { ExprUnresolved } from 'src/features/expressions/types';
import type { ILayoutCompFileUpload } from 'src/layout/FileUpload/types';
import type { ILayoutComponent } from 'src/layout/layout';

describe('attachment utils', () => {
  describe('shiftAttachmentRowInRepeatingGroup', () => {
    const mkAttachment = (id: string): IAttachment => ({
      id,
      name: 'someFile.txt',
      deleting: false,
      updating: false,
      size: 1234,
      tags: [],
      uploaded: true,
    });

    const mockAttachments: IAttachments = {
      uploader: [mkAttachment('id1'), mkAttachment('id2')],
      'inGroup-0': [mkAttachment('id3'), mkAttachment('id4')],
      'otherInGroup-0': [mkAttachment('id5'), mkAttachment('id6')],
      'nested-0-0': [mkAttachment('id7')],
      'nested-0-1': [mkAttachment('id8')],
      'nested-0-2': [mkAttachment('id9')],
      'inGroup-1': [mkAttachment('id10')],
      'otherInGroup-1': [mkAttachment('id11')],
      'nested-1-0': [mkAttachment('id12')],
      'nested-1-1': [mkAttachment('id13')],
      'nested-1-2': [mkAttachment('id14')],
      'otherNested-1-2': [mkAttachment('id15')],
    };

    const genericFileUploadProps: Pick<
      ILayoutCompFileUpload,
      'maxFileSizeInMB' | 'maxNumberOfAttachments' | 'minNumberOfAttachments' | 'displayMode'
    > = {
      displayMode: 'simple',
      maxFileSizeInMB: 15,
      maxNumberOfAttachments: 15,
      minNumberOfAttachments: 1,
    };

    const mockComponents: ExprUnresolved<ILayoutComponent>[] = [
      {
        id: 'uploader',
        type: 'FileUpload',
        ...genericFileUploadProps,
      },
      {
        id: 'inGroup',
        type: 'FileUpload',
        ...genericFileUploadProps,
      },
      {
        id: 'otherInGroup',
        type: 'FileUpload',
        ...genericFileUploadProps,
      },
      {
        id: 'nested',
        type: 'FileUpload',
        ...genericFileUploadProps,
      },
      {
        id: 'otherNested',
        type: 'FileUpload',
        ...genericFileUploadProps,
      },
    ];

    const simplify = (attachments: IAttachments): { [key: string]: string[] } => {
      const out = {};
      for (const key of Object.keys(attachments)) {
        out[key] = [];
        for (const attachment of attachments[key]) {
          out[key].push(attachment.id);
        }
      }

      return out;
    };

    it('should work when deleting top-level repeating group rows', () => {
      // Simulate deleting the first row of a top-level repeating group
      const result = shiftAttachmentRowInRepeatingGroup(mockAttachments, mockComponents, 'group', 0);

      expect(simplify(result)).toEqual(
        simplify({
          uploader: [mkAttachment('id1'), mkAttachment('id2')],
          'inGroup-0': [mkAttachment('id10')],
          'otherInGroup-0': [mkAttachment('id11')],
          'nested-0-0': [mkAttachment('id12')],
          'nested-0-1': [mkAttachment('id13')],
          'nested-0-2': [mkAttachment('id14')],
          'otherNested-0-2': [mkAttachment('id15')],
        }),
      );
    });

    it('should work when deleting second-level repeating group rows', () => {
      const result = shiftAttachmentRowInRepeatingGroup(mockAttachments, mockComponents, 'nestedGroup-1', 1);

      expect(simplify(result)).toEqual(
        simplify({
          uploader: [mkAttachment('id1'), mkAttachment('id2')],
          'inGroup-0': [mkAttachment('id3'), mkAttachment('id4')],
          'otherInGroup-0': [mkAttachment('id5'), mkAttachment('id6')],
          'nested-0-0': [mkAttachment('id7')],
          'nested-0-1': [mkAttachment('id8')],
          'nested-0-2': [mkAttachment('id9')],
          'inGroup-1': [mkAttachment('id10')],
          'otherInGroup-1': [mkAttachment('id11')],
          'nested-1-0': [mkAttachment('id12')],
          'nested-1-1': [mkAttachment('id14')],
          'otherNested-1-1': [mkAttachment('id15')],
        }),
      );
    });
  });

  describe('getFileEnding', () => {
    it('should get file ending correctly', () => {
      expect(getFileEnding('test.jpg')).toEqual('.jpg');
      expect(getFileEnding('navn.med.punktum.xml')).toEqual('.xml');
      expect(getFileEnding('navnutenfilendelse')).toEqual('');
      expect(getFileEnding(undefined)).toEqual('');
    });
  });

  describe('removeFileEnding', () => {
    it('should remove file ending correctly', () => {
      expect(removeFileEnding('test.jpg')).toEqual('test');
      expect(removeFileEnding('navn.med.punktum.xml')).toEqual('navn.med.punktum');
      expect(removeFileEnding('navnutenfilendelse')).toEqual('navnutenfilendelse');
      expect(removeFileEnding(undefined)).toEqual('');
    });
  });
});
