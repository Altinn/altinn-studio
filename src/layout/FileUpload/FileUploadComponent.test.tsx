import React from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getAttachments } from 'src/__mocks__/attachmentsMock';
import { FileUploadComponent } from 'src/layout/FileUpload/FileUploadComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { IAttachment } from 'src/features/attachments';
import type { CompFileUploadWithTagExternal } from 'src/layout/FileUploadWithTag/config.generated';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const testId = 'mockId';

describe('FileUploadComponent', () => {
  it('should show add attachment button and file counter when number of attachments is less than max', () => {
    render({
      component: { maxNumberOfAttachments: 3 },
      attachments: getAttachments({ count: 2 }),
    });

    expect(
      screen.getByRole('button', {
        name: 'Legg til flere vedlegg',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Antall filer 2\/3\./i)).toBeInTheDocument();
  });

  it('should not show add attachment button, and should show file counter when number of attachments is same as max', () => {
    render({
      component: { maxNumberOfAttachments: 3 },
      attachments: getAttachments({ count: 3 }),
    });

    expect(
      screen.queryByRole('button', {
        name: 'Legg til flere vedlegg',
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Antall filer 3\/3\./i)).toBeInTheDocument();
  });

  describe('file status', () => {
    it('should show loading when file uploaded=false', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].uploaded = false;

      render({ attachments });

      expect(screen.getByText('Laster innhold')).toBeInTheDocument();
    });

    it('should not show loading when file uploaded=true', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].uploaded = true;

      render({ attachments });

      expect(screen.queryByText('Laster innhold')).not.toBeInTheDocument();
    });

    it('should show loading when file deleting=true', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].deleting = true;

      render({ attachments });

      expect(screen.getByText('Laster innhold')).toBeInTheDocument();
    });

    it('should not show loading when file deleting=false', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].deleting = false;

      render({ attachments });

      expect(screen.queryByText('Laster innhold')).not.toBeInTheDocument();
    });
  });

  describe('displayMode', () => {
    it('should not display drop area when displayMode is simple', () => {
      render({
        component: { displayMode: 'simple' },
        attachments: getAttachments({ count: 3 }),
      });

      expect(screen.queryByTestId(`altinn-drop-zone-${testId}`)).not.toBeInTheDocument();
    });

    it('should display drop area when displayMode is not simple', () => {
      render({
        component: { displayMode: 'list' },
        attachments: getAttachments({ count: 3 }),
      });

      expect(screen.getByTestId(`altinn-drop-zone-${testId}`)).toBeInTheDocument();
    });

    it('should not display drop area when displayMode is not simple and max attachments is reached', () => {
      render({
        component: { displayMode: 'list', maxNumberOfAttachments: 3 },
        attachments: getAttachments({ count: 3 }),
      });

      expect(screen.queryByTestId(`altinn-drop-zone-${testId}`)).not.toBeInTheDocument();
    });
  });
});

describe('FileUploadWithTagComponent', () => {
  describe('uploaded', () => {
    it('should show spinner when file status has uploaded=false', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].uploaded = false;

      renderWithTag({ attachments });

      expect(screen.getByText('Laster innhold')).toBeInTheDocument();
    });

    it('should not show spinner when file status has uploaded=true', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].uploaded = true;

      renderWithTag({ attachments });

      expect(screen.queryByText('Laster innhold')).not.toBeInTheDocument();
    });
  });

  describe('updating', () => {
    it('should show spinner in edit mode when file status has updating=true', async () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].updating = true;

      renderWithTag({ attachments });
      await userEvent.click(screen.getByRole('button', { name: 'Rediger' }));

      expect(screen.getByText('Laster innhold')).toBeInTheDocument();
    });

    it('should not show spinner in edit mode when file status has updating=false', async () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].updating = false;

      renderWithTag({ attachments });
      await userEvent.click(screen.getByRole('button', { name: 'Rediger' }));

      expect(screen.queryByText('Laster innhold')).not.toBeInTheDocument();
    });
  });

  describe('editing', () => {
    it('should disable dropdown in edit mode when updating', async () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].updating = true;

      renderWithTag({ attachments });
      await userEvent.click(screen.getByRole('button', { name: 'Rediger' }));

      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('should not disable dropdown in edit mode when not updating', async () => {
      renderWithTag({ attachments: getAttachments({ count: 1 }) });
      await userEvent.click(screen.getByRole('button', { name: 'Rediger' }));

      expect(screen.getByRole('combobox')).not.toBeDisabled();
    });

    it('should not disable save button', async () => {
      renderWithTag({ attachments: getAttachments({ count: 1 }) });
      await userEvent.click(screen.getByRole('button', { name: 'Rediger' }));

      expect(
        screen.getByRole('button', {
          name: 'Lagre',
        }),
      ).not.toBeDisabled();
    });

    it('should disable save button when readOnly=true', async () => {
      const attachments = getAttachments({ count: 1 });

      renderWithTag({
        component: { readOnly: true },
        attachments,
      });
      await userEvent.click(screen.getByRole('button', { name: 'Rediger' }));

      expect(
        screen.getByRole('button', {
          name: 'Lagre',
        }),
      ).toBeDisabled();
    });

    it('should disable save button when attachment.uploaded=false', async () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].uploaded = false;

      renderWithTag({ attachments });
      await userEvent.click(screen.getByRole('button', { name: 'Rediger' }));

      expect(
        screen.getByRole('button', {
          name: 'Lagre',
        }),
      ).toBeDisabled();
    });

    it('should not show save button when attachment.updating=true', async () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].updating = true;

      renderWithTag({ attachments });
      await userEvent.click(screen.getByRole('button', { name: 'Rediger' }));
      expect(
        screen.queryByRole('button', {
          name: 'Lagre',
        }),
      ).not.toBeInTheDocument();
    });

    it('should automatically show attachments in edit mode for attachments without tags', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].tags = [];

      renderWithTag({ attachments });

      expect(
        screen.getByRole('button', {
          name: 'Lagre',
        }),
      ).toBeInTheDocument();
    });

    it('should not automatically show attachments in edit mode for attachments with tags', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].tags = ['tag1'];

      renderWithTag({ attachments });
      expect(
        screen.queryByRole('button', {
          name: 'Lagre',
        }),
      ).not.toBeInTheDocument();
    });
  });

  describe('files', () => {
    it('should display drop area when max attachments is not reached', () => {
      renderWithTag({
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
      renderWithTag({
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

interface Props extends Partial<RenderGenericComponentTestProps<'FileUpload'>> {
  attachments?: IAttachment[];
}

const render = ({ component, genericProps, attachments = getAttachments() }: Props = {}) => {
  renderGenericComponentTest({
    type: 'FileUpload',
    renderer: (props) => <FileUploadComponent {...props} />,
    component: {
      id: testId,
      displayMode: 'simple',
      maxFileSizeInMB: 2,
      maxNumberOfAttachments: 4,
      minNumberOfAttachments: 1,
      readOnly: false,
      ...component,
    },
    genericProps: {
      isValid: true,
      ...genericProps,
    },
    manipulateState: (state) => {
      state.attachments.attachments = {
        [testId]: attachments,
      };
    },
  });
};

const renderWithTag = ({ component, genericProps, attachments = getAttachments() }: Props = {}) => {
  renderGenericComponentTest({
    type: 'FileUploadWithTag',
    renderer: (props) => <FileUploadComponent {...props} />,
    component: {
      id: testId,
      type: 'FileUploadWithTag',
      displayMode: 'list',
      maxFileSizeInMB: 2,
      maxNumberOfAttachments: 7,
      minNumberOfAttachments: 1,
      readOnly: false,
      optionsId: 'test-options-id',
      textResourceBindings: {
        tagTitle: 'attachment-tag-title',
      },
      ...component,
    } as CompFileUploadWithTagExternal,
    genericProps: {
      isValid: true,
      ...genericProps,
    },
    manipulateState: (state) => {
      state.attachments = {
        attachments: {
          [testId]: attachments,
        },
      };
    },
  });
};
