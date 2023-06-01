import React from 'react';

import { screen } from '@testing-library/react';

import { getAttachments } from 'src/__mocks__/attachmentsMock';
import { FileUploadComponent } from 'src/layout/FileUpload/FileUploadComponent';
import { renderGenericComponentTest } from 'src/testUtils';
import type { IAttachment } from 'src/features/attachments';
import type { RenderGenericComponentTestProps } from 'src/testUtils';

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
    expect(screen.getByText(/form_filler\.file_uploader_number_of_files 2\/3\./i)).toBeInTheDocument();
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
    expect(screen.getByText(/form_filler\.file_uploader_number_of_files 3\/3\./i)).toBeInTheDocument();
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
