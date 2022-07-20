import React from 'react';

import { screen } from '@testing-library/react';

import { getAttachments } from 'src/../__mocks__/attachmentsMock';
import { getInitialStateMock } from 'src/../__mocks__/initialStateMock';
import { renderWithProviders } from 'src/../testUtils';
import { FileUploadComponent } from 'src/components/base/FileUpload/FileUploadComponent';
import type { IComponentProps } from 'src/components';
import type { IFileUploadProps } from 'src/components/base/FileUpload/FileUploadComponent';
import type { IAttachment } from 'src/shared/resources/attachments';

const testId = 'mockId';

describe('FileUploadComponent', () => {
  it('should show add attachment button and file counter when number of attachments is less than max', () => {
    render({
      props: { maxNumberOfAttachments: 3 },
      initialState: { attachments: getAttachments({ count: 2 }) },
    });

    expect(
      screen.getByRole('button', {
        name: /form_filler\.file_uploader_add_attachment/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/form_filler\.file_uploader_number_of_files 2\/3\./i),
    ).toBeInTheDocument();
  });

  it('should not show add attachment button, and should show file counter when number of attachments is same as max', () => {
    render({
      props: { maxNumberOfAttachments: 3 },
      initialState: { attachments: getAttachments({ count: 3 }) },
    });

    expect(
      screen.queryByRole('button', {
        name: /form_filler\.file_uploader_add_attachment/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/form_filler\.file_uploader_number_of_files 3\/3\./i),
    ).toBeInTheDocument();
  });

  describe('file status', () => {
    it('should show loading when file uploaded=false', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].uploaded = false;

      render({
        initialState: { attachments },
      });

      expect(screen.getByText(/general\.loading/i)).toBeInTheDocument();
    });

    it('should not show loading when file uploaded=true', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].uploaded = true;

      render({
        initialState: { attachments },
      });

      expect(screen.queryByText(/general\.loading/i)).not.toBeInTheDocument();
    });

    it('should show loading when file deleting=true', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].deleting = true;

      render({
        initialState: { attachments },
      });

      expect(screen.getByText(/general\.loading/i)).toBeInTheDocument();
    });

    it('should not show loading when file deleting=false', () => {
      const attachments = getAttachments({ count: 1 });
      attachments[0].deleting = false;

      render({
        initialState: { attachments },
      });

      expect(screen.queryByText(/general\.loading/i)).not.toBeInTheDocument();
    });
  });

  describe('displayMode', () => {
    it('should not display drop area when displayMode is simple', () => {
      render({
        props: { displayMode: 'simple' },
        initialState: { attachments: getAttachments({ count: 3 }) },
      });

      expect(
        screen.queryByTestId(`altinn-drop-zone-${testId}`),
      ).not.toBeInTheDocument();
    });

    it('should display drop area when displayMode is not simple', () => {
      render({
        props: { displayMode: 'list' },
        initialState: { attachments: getAttachments({ count: 3 }) },
      });

      expect(
        screen.getByTestId(`altinn-drop-zone-${testId}`),
      ).toBeInTheDocument();
    });

    it('should not display drop area when displayMode is not simple and max attachments is reached', () => {
      render({
        props: { displayMode: 'list', maxNumberOfAttachments: 3 },
        initialState: { attachments: getAttachments({ count: 3 }) },
      });

      expect(
        screen.queryByTestId(`altinn-drop-zone-${testId}`),
      ).not.toBeInTheDocument();
    });
  });
});

interface IRenderProps {
  props?: Partial<IFileUploadProps>;
  initialState?: {
    attachments?: IAttachment[];
  };
}

const render = ({
  props = {},
  initialState: { attachments = getAttachments() },
}: IRenderProps = {}) => {
  const initialState = {
    ...getInitialStateMock(),
    attachments: {
      attachments: {
        [testId]: attachments,
      },
    },
  };

  const allProps: IFileUploadProps = {
    id: testId,
    displayMode: 'simple',
    maxFileSizeInMB: 2,
    maxNumberOfAttachments: 4,
    minNumberOfAttachments: 1,
    isValid: true,
    readOnly: false,
    ...({} as IComponentProps),
    ...props,
  };

  return renderWithProviders(<FileUploadComponent {...allProps} />, {
    preloadedState: initialState,
  });
};
