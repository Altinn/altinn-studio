import React from 'react';
import { screen } from '@testing-library/react';

import type { IComponentProps } from 'src/components';

import type { IFileUploadWithTagProps } from './FileUploadWithTagComponent';
import type { IAttachment } from 'src/shared/resources/attachments';
import { AsciiUnitSeparator } from 'src/utils/attachment';
import { FileUploadWithTagComponent } from './FileUploadWithTagComponent';

import { renderWithProviders } from 'src/../testUtils';
import { getAttachments } from 'src/../__mocks__/attachmentsMock';
import { getFormLayoutStateMock } from 'src/../__mocks__/formLayoutStateMock';
import { getUiConfigStateMock } from 'src/../__mocks__/uiConfigStateMock';
import { getInitialStateMock } from 'src/../__mocks__/initialStateMock';

const testId = 'test-id';

describe('FileUploadWithTagComponent', () => {
  describe('uploaded', () => {
    it('should show spinner when file status has uploaded=false', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].uploaded = false;

      render({ initialState: { attachments } });

      expect(screen.getByText(/general\.loading/i)).toBeInTheDocument();
    });

    it('should not show spinner when file status has uploaded=true', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].uploaded = true;

      render({ initialState: { attachments } });

      expect(screen.queryByText(/general\.loading/i)).not.toBeInTheDocument();
    });
  });

  describe('updating', () => {
    it('should show spinner in edit mode when file status has updating=true', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].updating = true;

      render({ initialState: { attachments, editIndex: 0 } });

      expect(screen.getByText(/general\.loading/i)).toBeInTheDocument();
    });

    it('should not show spinner in edit mode when file status has updating=false', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].updating = false;

      render({ initialState: { attachments, editIndex: 0 } });

      expect(screen.queryByText(/general\.loading/i)).not.toBeInTheDocument();
    });
  });

  describe('editing', () => {
    it('should disable dropdown in edit mode when updating', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].updating = true;

      render({ initialState: { attachments, editIndex: 0 } });

      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('should not disable dropdown in edit mode when not updating', () => {
      render({
        initialState: {
          attachments: getAttachments({ count: 1 }),
          editIndex: 0,
        },
      });

      expect(screen.getByRole('combobox')).not.toBeDisabled();
    });

    it('should not disable save button', () => {
      render({
        initialState: {
          attachments: getAttachments({ count: 1 }),
          editIndex: 0,
        },
      });

      expect(
        screen.getByRole('button', {
          name: /general\.save/i,
        }),
      ).not.toBeDisabled();
    });

    it('should disable save button when readOnly=true', () => {
      const attachments = getAttachments({ count: 1 });

      render({
        props: { readOnly: true },
        initialState: { attachments, editIndex: 0 },
      });

      expect(
        screen.getByRole('button', {
          name: /general\.save/i,
        }),
      ).toBeDisabled();
    });

    it('should disable save button when attachment.uploaded=false', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].uploaded = false;

      render({ initialState: { attachments, editIndex: 0 } });

      expect(
        screen.getByRole('button', {
          name: /general\.save/i,
        }),
      ).toBeDisabled();
    });

    it('should not show save button when attachment.updating=true', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].updating = true;

      render({ initialState: { attachments, editIndex: 0 } });

      expect(
        screen.queryByRole('button', {
          name: /general\.save/i,
        }),
      ).not.toBeInTheDocument();
    });

    it('should automatically show attachments in edit mode for attachments without tags', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].tags = [];

      render({ initialState: { attachments } });

      expect(
        screen.getByRole('button', {
          name: /general\.save/i,
        }),
      ).toBeInTheDocument();
    });

    it('should not automatically show attachments in edit mode for attachments with tags', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].tags = ['tag1'];

      render({ initialState: { attachments } });

      expect(
        screen.queryByRole('button', {
          name: /general\.save/i,
        }),
      ).not.toBeInTheDocument();
    });
  });

  describe('files', () => {
    it('should display drop area when max attachments is not reached', () => {
      render({
        props: { maxNumberOfAttachments: 3 },
        initialState: { attachments: getAttachments({ count: 2 }) },
      });

      expect(
        screen.getByRole('button', {
          name: /form_filler\.file_uploader_drag form_filler\.file_uploader_find form_filler\.file_uploader_valid_file_format form_filler\.file_upload_valid_file_format_all/i,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(`altinn-drop-zone-${testId}`),
      ).toBeInTheDocument();
    });

    it('should not display drop area when max attachments is reached', () => {
      render({
        props: { maxNumberOfAttachments: 3 },
        initialState: { attachments: getAttachments({ count: 3 }) },
      });

      expect(
        screen.queryByRole('button', {
          name: /form_filler\.file_uploader_drag form_filler\.file_uploader_find form_filler\.file_uploader_valid_file_format form_filler\.file_upload_valid_file_format_all/i,
        }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId(`altinn-drop-zone-${testId}`),
      ).not.toBeInTheDocument();
    });
  });
});

interface IRenderProps {
  props?: Partial<IFileUploadWithTagProps>;
  initialState?: {
    attachments?: IAttachment[];
    editIndex?: number;
  };
}

const render = ({
  props = {},
  initialState: { attachments = getAttachments(), editIndex = -1 },
}: IRenderProps = {}) => {
  const initialState = {
    ...getInitialStateMock(),
    attachments: {
      attachments: {
        [testId]: attachments,
      },
      validationResults: {
        [testId]: {
          simpleBinding: {
            errors: [
              'mock error message',
              `attachment-id-2${AsciiUnitSeparator}mock error message`,
            ],
          },
        },
      },
    },
    optionState: {
      options: {
        test: {
          id: testId,
          options: [
            { value: 'attachment-tag-0', label: 'attachment-tag-label-0' },
            { value: 'attachment-tag-1', label: 'attachment-tag-label-1' },
            { value: 'attachment-tag-2', label: 'attachment-tag-label-2' },
          ],
          loading: false,
        },
      },
      error: null,
    },
    formLayout: {
      ...getFormLayoutStateMock(),
      uiConfig: {
        ...getUiConfigStateMock(),
        fileUploadersWithTag: {
          [testId]: {
            editIndex,
            chosenOptions: {
              'attachment-id-0': 'attachment-tag-0',
              'attachment-id-1': 'attachment-tag-1',
              'attachment-id-2': 'attachment-tag-2',
            },
          },
        },
      },
    },
  };

  const textResourceBindings = {
    tagTitle: 'attachment-tag-title',
    'attachment-tag-label-0': 'attachment-tag-value-0',
    'attachment-tag-label-1': 'attachment-tag-value-1',
    'attachment-tag-label-2': 'attachment-tag-value-2',
  };

  const allProps: IFileUploadWithTagProps = {
    id: testId,
    displayMode: 'simple',
    isValid: true,
    maxFileSizeInMB: 2,
    maxNumberOfAttachments: 7,
    minNumberOfAttachments: 1,
    readOnly: false,
    optionsId: 'test-options-id',
    getTextResource: jest.fn(),
    getTextResourceAsString: jest.fn(),
    textResourceBindings: textResourceBindings,
    ...({} as IComponentProps),
    ...props,
  };

  renderWithProviders(<FileUploadWithTagComponent {...allProps} />, {
    preloadedState: initialState,
  });
};
