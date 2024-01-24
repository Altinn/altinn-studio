import React from 'react';
import { render as rtlRender, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Canvas } from './Canvas';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import type { BpmnContextProviderProps } from '../../contexts/BpmnContext';
import { BpmnContextProvider } from '../../contexts/BpmnContext';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

const mockOnSave = jest.fn();

const mockAppLibVersion8: string = '8.0.1';
const mockAppLibVersion7: string = '7.0.1';

const defaultProps: BpmnContextProviderProps = {
  appLibVersion: mockAppLibVersion8,
  bpmnXml: '',
  children: null,
};

const render = (props: Partial<BpmnContextProviderProps> = {}) => {
  const allProps = { ...defaultProps, ...props };
  const router = createMemoryRouter([
    {
      path: '/',
      element: (
        <BpmnContextProvider {...allProps}>
          <Canvas onSave={mockOnSave} />
        </BpmnContextProvider>
      ),
    },
  ]);

  return rtlRender(<RouterProvider router={router}></RouterProvider>);
};

describe('Canvas', () => {
  afterEach(jest.clearAllMocks);

  it('hides actionMenu when version is 7 or older', async () => {
    const user = userEvent.setup();
    render({ appLibVersion: mockAppLibVersion7 });

    // Fix to remove act error
    await act(() => user.tab());

    const editButton = screen.queryByRole('button', { name: textMock('process_editor.save') });
    expect(editButton).not.toBeInTheDocument;
  });

  it('shows actionMenu when version is 8 or newer', async () => {
    const user = userEvent.setup();
    render({ appLibVersion: mockAppLibVersion8 });

    // Fix to remove act error
    await act(() => user.tab());

    const editButton = screen.getByRole('button', { name: textMock('process_editor.save') });
    expect(editButton).toBeInTheDocument;
  });
});
