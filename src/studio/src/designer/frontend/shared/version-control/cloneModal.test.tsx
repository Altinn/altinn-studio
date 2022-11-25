import React from 'react';
import { CloneModal } from './cloneModal';
import type { ICloneModalProps } from './cloneModal';
import { render as rtlRender, screen } from '@testing-library/react';

describe('cloneModal', () => {
  it('should show copy link if copy feature is supported', () => {
    document.queryCommandSupported = jest.fn(() => {
      return true;
    });
    render();

    expect(
      screen.getByRole('button', {
        name: /sync_header\.clone_https_button/i,
      })
    ).toBeInTheDocument();
  });

  it('should NOT show copy link if copy feature is NOT supported', () => {
    document.queryCommandSupported = jest.fn(() => {
      return false;
    });
    render();

    expect(
      screen.queryByRole('button', {
        name: /sync_header\.clone_https_button/i,
      })
    ).not.toBeInTheDocument();
  });
});

const render = (props: Partial<ICloneModalProps> = {}) => {
  const allProps = {
    anchorEl: document.querySelector('body'),
    onClose: jest.fn(),
    open: true,
    language: {},
    ...props,
  };

  return rtlRender(<CloneModal {...allProps} />);
};
