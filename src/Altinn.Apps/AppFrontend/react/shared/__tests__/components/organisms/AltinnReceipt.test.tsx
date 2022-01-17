import * as React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';

import AltinnReceipt from '../../../src/components/organisms/AltinnReceipt';

const render = (props = {}) => {
  const allProps = {
    body: 'body',
    collapsibleTitle: 'collapsibleTitle',
    instanceMetaDataObject: {},
    title: 'title',
    titleSubmitted: 'titleSubmitted',
    ...props,
  };

  rtlRender(<AltinnReceipt {...allProps} />);
};

const attachment1 = {
  name: 'attachment1Name',
  iconClass: 'attachment1IconClass',
  url: 'attachment1Url',
  dataType: 'attachment1DataType',
};
const attachment2 = {
  name: 'attachment2Name',
  iconClass: 'attachment2IconClass',
  url: 'attachment2Url',
  dataType: 'attachment2DataType',
};

describe('AltinnReceipt', () => {
  it('should show titleSubmitted when set', () => {
    render();

    expect(
      screen.getByRole('heading', {
        name: /titlesubmitted/i,
      }),
    ).toBeInTheDocument();
  });

  it('should not show titleSubmitted when not set', () => {
    render({ titleSubmitted: undefined });

    expect(
      screen.queryByRole('heading', {
        name: /titlesubmitted/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('should show subtitle when set', () => {
    render({ subtitle: 'subtitle' });

    expect(screen.getByText(/subtitle/i)).toBeInTheDocument();
  });

  it('should not show subtitle when not set', () => {
    render();

    expect(screen.queryByText(/subtitle/i)).not.toBeInTheDocument();
  });

  it('should show body when set', () => {
    render({ body: 'body-text' });

    expect(screen.getByText(/body-text/i)).toBeInTheDocument();
  });

  it('should not show body when not set', () => {
    render();

    expect(screen.queryByText(/body-text/i)).not.toBeInTheDocument();
  });

  it('should show 2 attachments in default group when group name is not set', () => {
    render({
      attachmentGroupings: {
        null: [attachment1, attachment2],
      },
      collapsibleTitle: 'collapsibleTitle',
      hideCollapsibleCount: false,
    });

    expect(screen.getByText(/collapsibletitle \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/attachment1name/i)).toBeInTheDocument();
    expect(screen.getByText(/attachment2name/i)).toBeInTheDocument();
  });

  it('should not show collapsible count when hideCollapsibleCount is true', () => {
    render({
      attachmentGroupings: {
        null: [attachment1, attachment2],
      },
      collapsibleTitle: 'collapsibleTitle',
      hideCollapsibleCount: true,
    });

    expect(screen.getByText(/collapsibletitle/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/collapsibletitle \(2\)/i),
    ).not.toBeInTheDocument();
  });

  it('should show attachments in defined groups', () => {
    render({
      attachmentGroupings: {
        group1: [attachment1],
        group2: [attachment2],
      },
      collapsibleTitle: 'collapsibleTitle',
      hideCollapsibleCount: false,
    });

    expect(screen.getByText(/group1 \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/group2 \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/attachment1name/i)).toBeInTheDocument();
    expect(screen.getByText(/attachment2name/i)).toBeInTheDocument();
  });
});
