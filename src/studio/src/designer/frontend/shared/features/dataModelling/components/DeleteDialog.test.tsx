import React from 'react';
import type { IDeleteDialogProps } from './DeleteDialog';
import { DeleteDialog } from './DeleteDialog';
import { render as rtlRender } from '@testing-library/react';

describe('DeleteDialog', () => {
  it('should match snapshot with the least amount of params', () => {
    const { container } = render();

    expect(container.firstChild).toMatchSnapshot;
  });
});

const render = (props: Partial<IDeleteDialogProps> = {}) => {
  const allProps = {
    anchor: document.body,
    language: { administration: {} },
    schemaName: 'some-name',
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
    ...props,
  } as IDeleteDialogProps;

  return rtlRender(<DeleteDialog {...allProps} />);
};
