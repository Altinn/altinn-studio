import { describe, expect, it } from 'vitest';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { LayoutComponent } from '../types';
import { getAllowedFileTypes, setAllowedFileTypes, toAttachmentDataType } from './fileUploadUtils';

const fileUpload: LayoutComponent = { id: 'upload', type: ComponentType.FileUpload };

describe('allowed file types', () => {
  it('limits the file upload to the endings of the chosen types', () => {
    const limited = setAllowedFileTypes(fileUpload, ['PDF', 'Word']);
    expect(limited).toMatchObject({
      hasCustomFileEndings: true,
      validFileEndings: ['.pdf', '.doc', '.docx'],
    });
    expect(getAllowedFileTypes(limited)).toEqual(['PDF', 'Word']);
  });

  it('allows every type when none is chosen, without empty properties', () => {
    const limited = setAllowedFileTypes(fileUpload, ['PDF']);
    expect(setAllowedFileTypes(limited, [])).toEqual(fileUpload);
  });
});

describe('file endings written as one string', () => {
  const component = { ...fileUpload, hasCustomFileEndings: true, validFileEndings: '.pdf, .png' };

  it('reads the allowed types', () => {
    expect(getAllowedFileTypes(component)).toEqual(['PDF', 'PNG']);
  });

  it('keeps them in the attachment data type', () => {
    expect(toAttachmentDataType(component, 'Task_1').fileType).toBe('.pdf, .png');
  });
});

describe('toAttachmentDataType', () => {
  it('takes any number of attachments when the minimum depends on a rule', () => {
    const component = { ...fileUpload, minNumberOfAttachments: ['if', true, 1, 'else', 0] };
    expect(toAttachmentDataType(component, 'Task_1').minCount).toBe(0);
  });

  it('repeats the limits of the component', () => {
    const component = {
      ...setAllowedFileTypes(fileUpload, ['PNG']),
      maxNumberOfAttachments: 3,
      maxFileSizeInMB: 25,
    };
    expect(toAttachmentDataType(component, 'Task_1')).toEqual({
      id: 'upload',
      taskId: 'Task_1',
      maxCount: 3,
      minCount: 0,
      maxSize: 25,
      fileType: '.png',
    });
  });
});
