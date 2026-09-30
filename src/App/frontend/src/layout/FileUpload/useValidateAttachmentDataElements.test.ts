import { getAttachmentDataMock, getAttachmentMock } from 'src/__mocks__/getAttachmentsMock';
import { FileScanResults } from 'src/features/attachments/types';
import { FrontendValidationSource, ValidationMask } from 'src/features/validation';
import { validateAttachmentDataElements } from 'src/layout/FileUpload/useValidateAttachmentDataElements';

describe('validateAttachmentDataElements', () => {
  it('returns an ordinary component validation for each infected uploaded file', () => {
    const infected = getAttachmentMock({
      uploaded: true,
      data: getAttachmentDataMock({ filename: 'virus.pdf', fileScanResult: FileScanResults.Infected }),
    });
    const clean = getAttachmentMock({
      uploaded: true,
      data: getAttachmentDataMock({ filename: 'clean.pdf', fileScanResult: FileScanResults.Clean }),
    });

    expect(validateAttachmentDataElements([infected, clean], {})).toEqual([
      {
        source: FrontendValidationSource.Component,
        message: { key: 'general.wait_for_attachments_infected', params: ['virus.pdf'] },
        severity: 'error',
        category: ValidationMask.Component,
      },
    ]);
  });

  it('does not create scan validations for temporary or pending files', () => {
    const temporary = {
      uploaded: false as const,
      deleting: false,
      updating: false,
      data: { temporaryId: 'temporary', filename: 'uploading.pdf', size: 100 },
    };
    const pending = getAttachmentMock({
      uploaded: true,
      data: getAttachmentDataMock({ fileScanResult: FileScanResults.Pending }),
    });

    expect(validateAttachmentDataElements([temporary, pending], {})).toEqual([]);
  });
});
