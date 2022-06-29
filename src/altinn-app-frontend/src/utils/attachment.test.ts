import type {
  IAttachments,
  IAttachment,
} from 'src/shared/resources/attachments';
import type { ILayoutComponent } from 'src/features/form/layout';
import { shiftAttachmentRowInRepeatingGroup } from 'src/utils/attachment';

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

  const mockComponents: ILayoutComponent[] = [
    {
      id: 'uploader',
      type: 'FileUpload',
    } as ILayoutComponent,
    {
      id: 'inGroup',
      type: 'FileUpload',
    } as ILayoutComponent,
    {
      id: 'otherInGroup',
      type: 'FileUpload',
    } as ILayoutComponent,
    {
      id: 'nested',
      type: 'FileUpload',
    } as ILayoutComponent,
    {
      id: 'otherNested',
      type: 'FileUpload',
    } as ILayoutComponent,
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
    const result = shiftAttachmentRowInRepeatingGroup(
      mockAttachments,
      mockComponents,
      'group',
      0,
    );

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
    const result = shiftAttachmentRowInRepeatingGroup(
      mockAttachments,
      mockComponents,
      'nestedGroup-1',
      1,
    );

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
