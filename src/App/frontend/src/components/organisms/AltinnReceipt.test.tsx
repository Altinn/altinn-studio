import React from 'react';

import { screen } from '@testing-library/react';

import { IReceiptComponentProps, ReceiptComponent } from 'src/components/organisms/AltinnReceipt';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import { IDisplayAttachment } from 'src/types/shared';

const render = async (props: Partial<IReceiptComponentProps> = {}) => {
  const allProps = {
    attachments: undefined,
    body: 'body',
    collapsibleTitle: <>collapsibleTitle</>,
    instanceMetaDataObject: {},
    title: 'title',
    titleSubmitted: 'titleSubmitted',
    pdf: [],
    ...props,
  };

  await renderWithoutInstanceAndLayout({
    renderer: () => <ReceiptComponent {...allProps} />,
  });
};

const attachment1 = {
  name: 'attachment1Name',
  iconClass: 'attachment1IconClass',
  url: 'attachment1Url',
  dataType: 'attachment1DataType',
} as IDisplayAttachment;
const attachment2 = {
  name: 'attachment2Name',
  iconClass: 'attachment2IconClass',
  url: 'attachment2Url',
  dataType: 'attachment2DataType',
} as IDisplayAttachment;

describe('AltinnReceipt', () => {
  it('should not show titleSubmitted when there are no pdfs', async () => {
    await render();

    expect(
      screen.queryByRole('heading', {
        name: /titlesubmitted/i,
      }),
    ).not.toBeInTheDocument();

    expect(screen.queryByTestId('attachment-list')).not.toBeInTheDocument();
  });

  it('should show titleSubmitted when there are pdfs', async () => {
    await render({ pdf: [{} as IDisplayAttachment] });

    expect(
      screen.getByRole('heading', {
        name: /titlesubmitted/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByTestId('attachment-list')).toBeInTheDocument();
  });

  it('should not show titleSubmitted when not set', async () => {
    await render({ titleSubmitted: undefined });

    expect(
      screen.queryByRole('heading', {
        name: /titlesubmitted/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('should show subtitle when set', async () => {
    await render({ subtitle: 'subtitle' });

    expect(screen.getByText(/subtitle/i)).toBeInTheDocument();
  });

  it('should not show subtitle when not set', async () => {
    await render();

    expect(screen.queryByText(/subtitle/i)).not.toBeInTheDocument();
  });

  it('should show body when set', async () => {
    await render({ body: 'body-text' });

    expect(screen.getByText(/body-text/i)).toBeInTheDocument();
  });

  it('should not show body when not set', async () => {
    await render();

    expect(screen.queryByText(/body-text/i)).not.toBeInTheDocument();
  });

  it('should show 2 attachments in default group when group name is not set', async () => {
    await render({
      attachments: [attachment1, attachment2],
      collapsibleTitle: <>collapsibleTitle</>,
      hideCollapsibleCount: false,
    });

    expect(screen.getByText(/collapsibletitle \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/attachment1name/i)).toBeInTheDocument();
    expect(screen.getByText(/attachment2name/i)).toBeInTheDocument();
  });

  it('should not show collapsible count when hideCollapsibleCount is true', async () => {
    await render({
      attachments: [attachment1, attachment2],
      collapsibleTitle: <>collapsibleTitle</>,
      hideCollapsibleCount: true,
    });

    expect(screen.getByText(/collapsibletitle/i)).toBeInTheDocument();
    expect(screen.queryByText(/collapsibletitle \(2\)/i)).not.toBeInTheDocument();
  });

  it('should show attachments in defined groups', async () => {
    await render({
      attachments: [
        { ...attachment1, grouping: 'group1' },
        { ...attachment2, grouping: 'group2' },
      ],
      collapsibleTitle: <>collapsibleTitle</>,
      hideCollapsibleCount: false,
    });

    expect(screen.getByText(/group1 \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/group2 \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/attachment1name/i)).toBeInTheDocument();
    expect(screen.getByText(/attachment2name/i)).toBeInTheDocument();
  });
});
