import React from 'react';
import { CloneModal } from './CloneModal';
import type { ICloneModalProps } from './CloneModal';
import { render as rtlRender, screen } from '@testing-library/react';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';

const render = (props: Partial<ICloneModalProps> = {}) => {
  const allProps = {
    // eslint-disable-next-line testing-library/no-node-access
    anchorEl: document.querySelector('body'),
    onClose: jest.fn(),
    open: true,
    language: {},
    ...props,
  };
  const queries: Partial<ServicesContextProps> = {
    getDatamodelsXsd: async () => [],
  };
  return rtlRender(
    <ServicesContextProvider {...queries}>
      <CloneModal {...allProps} />
    </ServicesContextProvider>,
  );
};

describe('cloneModal', () => {
  it('should show copy link if copy feature is supported', () => {
    document.queryCommandSupported = jest.fn(() => {
      return true;
    });
    render();

    expect(
      screen.getByRole('button', {
        name: textMock('sync_header.clone_https_button'),
      }),
    ).toBeInTheDocument();
  });

  it('should NOT show copy link if copy feature is NOT supported', () => {
    document.queryCommandSupported = jest.fn(() => {
      return false;
    });
    render();

    expect(
      screen.queryByRole('button', {
        name: textMock('sync_header.clone_https_button'),
      }),
    ).not.toBeInTheDocument();
  });
});
