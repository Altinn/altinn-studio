import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import type { ISyncModalProps } from './SyncModal';
import { SyncModal } from './SyncModal';

describe('syncModal', () => {
  it('should match snapshot when anchor element is null', () => {
    const { container } = render();
    // eslint-disable-next-line testing-library/no-node-access
    expect(container.firstChild).toMatchSnapshot();
  });
});

const render = (props: Partial<ISyncModalProps> = {}) => {
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
  } as ISyncModalProps;

  return rtlRender(<SyncModal {...allProps} />);
};
