import React from 'react';
import { render as rtlRender, screen, act } from '@testing-library/react';
import type { ProcessEditorProps } from './ProcessEditor';
import { ProcessEditor } from './ProcessEditor';
import { textMock } from '../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;

const mockAppLibVersion8: string = '8.0.3';
const mockAppLibVersion7: string = '7.0.3';

const mockOnSave = jest.fn();

const defaultProps: ProcessEditorProps = {
  bpmnXml: mockBPMNXML,
  onSave: mockOnSave,
  appLibVersion: mockAppLibVersion8,
  layoutSets: { sets: [] },
  existingCustomReceiptLayoutSetName: undefined,
  addLayoutSet: jest.fn(),
  mutateLayoutSet: jest.fn(),
};

const render = (props: Partial<ProcessEditorProps> = {}) => {
  const allProps = { ...defaultProps, ...props };
  const router = createMemoryRouter([
    {
      path: '/',
      element: <ProcessEditor {...allProps} />,
    },
  ]);

  return rtlRender(<RouterProvider router={router}></RouterProvider>);
};

describe('ProcessEditor', () => {
  it('should render loading while bpmnXml is undefined', () => {
    render({ bpmnXml: undefined });
    expect(screen.getByTitle(textMock('process_editor.loading'))).toBeInTheDocument();
  });

  it('should render "NoBpmnFoundAlert" when bpmnXml is null', () => {
    render({ bpmnXml: null });
    expect(
      screen.getByRole('heading', {
        name: textMock('process_editor.fetch_bpmn_error_title'),
        level: 2,
      }),
    ).toBeInTheDocument();
  });

  it('should render "canvas" when bpmnXml is provided and default render is edit-mode', async () => {
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(() => {
      render();
    });

    expect(
      screen.getByRole('button', { name: textMock('process_editor.save') }),
    ).toBeInTheDocument();
  });

  it('does not display the information about too old version when the version is 8 or newer', async () => {
    const user = userEvent.setup();
    render();

    // Fix to remove act error
    await act(() => user.tab());

    const alertHeader = screen.queryByRole('heading', {
      name: textMock('process_editor.too_old_version_title'),
      level: 1,
    });
    expect(alertHeader).not.toBeInTheDocument();
  });

  it('displays the alert when the version is 7 or older', async () => {
    const user = userEvent.setup();
    render({ appLibVersion: mockAppLibVersion7 });

    // Fix to remove act error
    await act(() => user.tab());

    const tooOldText = screen.getByText(textMock('process_editor.too_old_version_title'));
    expect(tooOldText).toBeInTheDocument();
  });
});
