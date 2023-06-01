import React from 'react';

import { screen } from '@testing-library/react';

import { getAttachments } from 'src/__mocks__/attachmentsMock';
import { getFormLayoutStateMock } from 'src/__mocks__/formLayoutStateMock';
import { getUiConfigStateMock } from 'src/__mocks__/uiConfigStateMock';
import { FileUploadWithTagComponent } from 'src/layout/FileUploadWithTag/FileUploadWithTagComponent';
import { renderGenericComponentTest } from 'src/testUtils';
import type { IAttachment } from 'src/features/attachments';
import type { RenderGenericComponentTestProps } from 'src/testUtils';

const testId = 'test-id';

describe('FileUploadWithTagComponent', () => {
  describe('uploaded', () => {
    it('should show spinner when file status has uploaded=false', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].uploaded = false;

      render({ attachments });

      expect(screen.getByText('Laster innhold')).toBeInTheDocument();
    });

    it('should not show spinner when file status has uploaded=true', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].uploaded = true;

      render({ attachments });

      expect(screen.queryByText('Laster innhold')).not.toBeInTheDocument();
    });
  });

  describe('updating', () => {
    it('should show spinner in edit mode when file status has updating=true', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].updating = true;

      render({ attachments, editIndex: 0 });

      expect(screen.getByText('Laster innhold')).toBeInTheDocument();
    });

    it('should not show spinner in edit mode when file status has updating=false', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].updating = false;

      render({ attachments, editIndex: 0 });

      expect(screen.queryByText('Laster innhold')).not.toBeInTheDocument();
    });
  });

  describe('editing', () => {
    it('should disable dropdown in edit mode when updating', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].updating = true;

      render({ attachments, editIndex: 0 });

      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('should not disable dropdown in edit mode when not updating', () => {
      render({
        attachments: getAttachments({ count: 1 }),
        editIndex: 0,
      });

      expect(screen.getByRole('combobox')).not.toBeDisabled();
    });

    it('should not disable save button', () => {
      render({
        attachments: getAttachments({ count: 1 }),
        editIndex: 0,
      });

      expect(
        screen.getByRole('button', {
          name: 'Lagre',
        }),
      ).not.toBeDisabled();
    });

    it('should disable save button when readOnly=true', () => {
      const attachments = getAttachments({ count: 1 });

      render({
        component: { readOnly: true },
        attachments,
        editIndex: 0,
      });

      expect(
        screen.getByRole('button', {
          name: 'Lagre',
        }),
      ).toBeDisabled();
    });

    it('should disable save button when attachment.uploaded=false', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].uploaded = false;

      render({ attachments, editIndex: 0 });

      expect(
        screen.getByRole('button', {
          name: 'Lagre',
        }),
      ).toBeDisabled();
    });

    it('should not show save button when attachment.updating=true', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].updating = true;

      render({ attachments, editIndex: 0 });

      expect(
        screen.queryByRole('button', {
          name: 'Lagre',
        }),
      ).not.toBeInTheDocument();
    });

    it('should automatically show attachments in edit mode for attachments without tags', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].tags = [];

      render({ attachments });

      expect(
        screen.getByRole('button', {
          name: 'Lagre',
        }),
      ).toBeInTheDocument();
    });

    it('should not automatically show attachments in edit mode for attachments with tags', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].tags = ['tag1'];

      render({ attachments });

      expect(
        screen.queryByRole('button', {
          name: 'Lagre',
        }),
      ).not.toBeInTheDocument();
    });
  });

  describe('files', () => {
    it('should display drop area when max attachments is not reached', () => {
      render({
        component: { maxNumberOfAttachments: 3 },
        attachments: getAttachments({ count: 2 }),
      });

      expect(
        screen.getByRole('presentation', {
          name: 'Dra og slipp eller let etter fil Tillatte filformater er: alle',
        }),
      ).toBeInTheDocument();
    });

    it('should not display drop area when max attachments is reached', () => {
      render({
        component: { maxNumberOfAttachments: 3 },
        attachments: getAttachments({ count: 3 }),
      });

      expect(
        screen.queryByRole('presentation', {
          name: 'Dra og slipp eller let etter fil Tillatte filformater er: alle',
        }),
      ).not.toBeInTheDocument();
    });
  });
});

interface Props extends Partial<RenderGenericComponentTestProps<'FileUploadWithTag'>> {
  attachments?: IAttachment[];
  editIndex?: number;
}

const render = ({ component, genericProps, attachments = getAttachments(), editIndex = -1 }: Props = {}) => {
  renderGenericComponentTest({
    type: 'FileUploadWithTag',
    renderer: (props) => <FileUploadWithTagComponent {...props} />,
    component: {
      id: testId,
      displayMode: 'simple',
      maxFileSizeInMB: 2,
      maxNumberOfAttachments: 7,
      minNumberOfAttachments: 1,
      readOnly: false,
      optionsId: 'test-options-id',
      textResourceBindings: {
        tagTitle: 'attachment-tag-title',
        'attachment-tag-label-0': 'attachment-tag-value-0',
        'attachment-tag-label-1': 'attachment-tag-value-1',
        'attachment-tag-label-2': 'attachment-tag-value-2',
      },
      ...component,
    },
    genericProps: {
      isValid: true,
      getTextResource: jest.fn(),
      getTextResourceAsString: jest.fn(),
      ...genericProps,
    },
    manipulateState: (state) => {
      state.attachments = {
        attachments: {
          [testId]: attachments,
        },
      };
      state.optionState = {
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
        loading: false,
      };
      state.formLayout = {
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
      };
    },
  });
};
