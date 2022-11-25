import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { SyncModal } from './SyncModal';
import type { ISyncModalComponentProps } from './SyncModal';

describe('syncModal', () => {
  it('should match snapshot when anchor element is null', () => {
    const { container } = render();

    expect(container.firstChild).toMatchSnapshot();
  });
});

const render = (props: Partial<ISyncModalComponentProps> = {}) => {
  const allProps = {
    anchorEl: null,
    header: 'Header text',
    descriptionText: ['Description text'],
    isLoading: false,
    shouldShowDoneIcon: false,
    btnText: 'Button text',
    shouldShowCommitBox: false,
    handleClose: jest.fn(),
    btnMethod: jest.fn(),
    ...props,
  } as ISyncModalComponentProps;

  return rtlRender(<SyncModal {...allProps} />);
};
