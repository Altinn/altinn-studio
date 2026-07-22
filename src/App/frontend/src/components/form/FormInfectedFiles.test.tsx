import React from 'react';

import { screen, waitFor } from '@testing-library/react';

import { getAttachmentDataMock, getAttachmentMock } from 'src/__mocks__/getAttachmentsMock';
import { Form } from 'src/components/form/Form';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IAttachment, TemporaryAttachment, UploadedAttachment } from 'src/features/attachments';
import type { FileScanResult } from 'src/features/attachments/types';

const mockUseAllAttachments = jest.fn();
const mockUseHasPendingAttachments = jest.fn(() => false);
const mockUseAttachmentState = jest.fn(() => ({ hasPending: false, state: 'ready' }));

jest.mock('src/features/attachments/hooks', () => ({
  useAllAttachments: () => mockUseAllAttachments(),
  useHasPendingAttachments: () => mockUseHasPendingAttachments(),
  useAttachmentState: () => mockUseAttachmentState(),
  useAttachmentsSelector: jest.fn(),
  useFailedAttachmentsFor: jest.fn(() => []),
  useWaitUntilUploaded: jest.fn(),
}));

describe('Form with Infected Files Integration', () => {
  const createInfectedAttachment = (filename = 'infected-file.pdf'): UploadedAttachment =>
    getAttachmentMock({
      data: getAttachmentDataMock({
        fileScanResult: 'Infected' as FileScanResult,
        filename,
      }),
      uploaded: true,
    });

  const createCleanAttachment = (filename = 'clean-file.pdf'): UploadedAttachment =>
    getAttachmentMock({
      data: getAttachmentDataMock({
        fileScanResult: 'Clean' as FileScanResult,
        filename,
      }),
      uploaded: true,
    });

  const createPendingAttachment = (filename = 'scanning-file.pdf'): UploadedAttachment =>
    getAttachmentMock({
      data: getAttachmentDataMock({
        fileScanResult: 'Pending' as FileScanResult,
        filename,
      }),
      uploaded: true,
    });

  const renderFormWithAttachments = async (attachments: IAttachment[], nodeId = 'fileUpload-1') => {
    const mockAttachments = { [nodeId]: attachments };
    mockUseAllAttachments.mockReturnValue(mockAttachments);

    return await renderWithInstanceAndLayout({
      renderer: () => <Form />,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ErrorReport integration with infected files', () => {
    it('should show ErrorReport when infected files are present', async () => {
      const infectedFile = createInfectedAttachment('malware.exe');
      await renderFormWithAttachments([infectedFile]);

      await waitFor(() => {
        expect(screen.getByTestId('ErrorReport')).toBeInTheDocument();
      });

      expect(screen.getByText(/du må rette disse feilene/i)).toBeInTheDocument();
    });

    it('should not show ErrorReport when only clean files are present', async () => {
      const cleanFile = createCleanAttachment('document.pdf');
      await renderFormWithAttachments([cleanFile]);

      await waitFor(() => {
        expect(screen.queryByTestId('ErrorReport')).not.toBeInTheDocument();
      });
    });

    it('should show ErrorReport when mixed with both clean and infected files', async () => {
      const cleanFile = createCleanAttachment('document.pdf');
      const infectedFile = createInfectedAttachment('malware.exe');
      await renderFormWithAttachments([cleanFile, infectedFile]);

      await waitFor(() => {
        expect(screen.getByTestId('ErrorReport')).toBeInTheDocument();
      });
    });

    it('should not show ErrorReport for pending scan results', async () => {
      const pendingFile = createPendingAttachment('scanning.pdf');
      await renderFormWithAttachments([pendingFile]);

      await waitFor(() => {
        expect(screen.queryByTestId('ErrorReport')).not.toBeInTheDocument();
      });
    });
  });

  describe('Infected file error messages in ErrorReport', () => {
    it('should display infected file error with Norwegian message', async () => {
      const infectedFile = createInfectedAttachment('dangerous-malware.exe');
      await renderFormWithAttachments([infectedFile]);

      await waitFor(() => {
        // Should show the infected file message
        expect(screen.getByText(/fjern infiserte filer/i)).toBeInTheDocument();
      });
    });

    it('should display multiple infected file errors', async () => {
      const infectedFile1 = createInfectedAttachment('malware1.exe');
      const infectedFile2 = createInfectedAttachment('malware2.pdf');
      await renderFormWithAttachments([infectedFile1, infectedFile2]);

      await waitFor(() => {
        expect(screen.getByTestId('ErrorReport')).toBeInTheDocument();

        const errorLinks = screen.getAllByText(/fjern infiserte filer/i);
        expect(errorLinks).toHaveLength(2);
      });
    });

    it('should create clickable error buttons for infected files', async () => {
      const infectedFile = createInfectedAttachment('virus.pdf');
      await renderFormWithAttachments([infectedFile]);

      await waitFor(() => {
        expect(screen.getByTestId('ErrorReport')).toBeInTheDocument();
      });

      // The error should be present in the error list as a clickable button
      const errorElement = screen.getByText(/fjern infiserte filer/i);
      expect(errorElement).toBeInTheDocument();

      // Should be in a button (ErrorWithLink uses button element)
      expect(errorElement.closest('button')).toBeInTheDocument();

      // Should be in a list item as part of error report structure
      expect(errorElement.closest('li')).toBeInTheDocument();
    });
  });

  describe('Form state integration', () => {
    it('should handle empty attachments without errors', async () => {
      await renderFormWithAttachments([]);

      await waitFor(() => {
        expect(screen.queryByTestId('ErrorReport')).not.toBeInTheDocument();
      });
    });

    it('should handle non-uploaded infected files (should not show in ErrorReport)', async () => {
      const nonUploadedInfectedFile: TemporaryAttachment = {
        uploaded: false,
        data: {
          temporaryId: 'temp-id',
          filename: 'malware.exe',
          size: 1024,
        },
        updating: false,
        deleting: false,
      };

      await renderFormWithAttachments([nonUploadedInfectedFile]);

      await waitFor(() => {
        expect(screen.queryByTestId('ErrorReport')).not.toBeInTheDocument();
      });
    });

    it('should handle files without scan results', async () => {
      const fileWithoutScanResult = getAttachmentMock({
        data: {
          ...getAttachmentDataMock({ filename: 'legacy-file.pdf' }),
          fileScanResult: undefined,
        },
        uploaded: true,
      });

      await renderFormWithAttachments([fileWithoutScanResult]);

      await waitFor(() => {
        expect(screen.queryByTestId('ErrorReport')).not.toBeInTheDocument();
      });
    });
  });

  describe('Different file scan results', () => {
    it('should not show ErrorReport for NotApplicable scan results', async () => {
      const notApplicableFile = getAttachmentMock({
        data: getAttachmentDataMock({
          fileScanResult: 'NotApplicable' as FileScanResult,
          filename: 'config.txt',
        }),
        uploaded: true,
      });

      await renderFormWithAttachments([notApplicableFile]);

      await waitFor(() => {
        expect(screen.queryByTestId('ErrorReport')).not.toBeInTheDocument();
      });
    });

    it('should not show ErrorReport for Clean scan results', async () => {
      const cleanFile = createCleanAttachment('document.pdf');
      await renderFormWithAttachments([cleanFile]);

      await waitFor(() => {
        expect(screen.queryByTestId('ErrorReport')).not.toBeInTheDocument();
      });
    });

    it('should show ErrorReport only for Infected scan results', async () => {
      const testFiles = [
        createCleanAttachment('clean.pdf'),
        createPendingAttachment('scanning.pdf'),
        getAttachmentMock({
          data: getAttachmentDataMock({
            fileScanResult: 'NotApplicable' as FileScanResult,
            filename: 'config.txt',
          }),
          uploaded: true,
        }),
        createInfectedAttachment('malware.exe'), // Only this should trigger ErrorReport
      ];

      await renderFormWithAttachments(testFiles);

      await waitFor(() => {
        expect(screen.getByTestId('ErrorReport')).toBeInTheDocument();

        expect(screen.getByText(/fjern infiserte filer/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form behavior validation based on commits', () => {
    it('should check for infected files using uploaded status and fileScanResult', async () => {
      const infectedFile = createInfectedAttachment('malware.exe');
      await renderFormWithAttachments([infectedFile]);

      expect(mockUseAllAttachments).toHaveBeenCalled();

      await waitFor(() => {
        expect(screen.getByTestId('ErrorReport')).toBeInTheDocument();
      });
    });

    it('should create proper error structure matching ErrorReport.tsx implementation', async () => {
      const infectedFile = createInfectedAttachment('virus.pdf');
      await renderFormWithAttachments([infectedFile]);

      await waitFor(() => {
        expect(screen.getByTestId('ErrorReport')).toBeInTheDocument();

        expect(screen.getByText(/fjern infiserte filer/i)).toBeInTheDocument();

        const errorElement = screen.getByText(/fjern infiserte filer/i);
        expect(errorElement.closest('button')).toBeInTheDocument();
      });
    });
  });
});
