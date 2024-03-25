import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ProcessEditorProps } from './ProcessEditor';
import { ProcessEditor } from './ProcessEditor';
import { textMock } from '../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;

const mockAppLibVersion8: string = '8.0.3';

const mockSaveBpmn = jest.fn();

const defaultProps: ProcessEditorProps = {
  bpmnXml: mockBPMNXML,
  saveBpmn: mockSaveBpmn,
  appLibVersion: mockAppLibVersion8,
  availableDataModelIds: [],
  layoutSets: { sets: [] },
  pendingApiOperations: false,
  existingCustomReceiptLayoutSetName: undefined,
  addLayoutSet: jest.fn(),
  deleteLayoutSet: jest.fn(),
  mutateLayoutSet: jest.fn(),
};

const renderProcessEditor = (props: Partial<ProcessEditorProps> = {}) => {
  const allProps = { ...defaultProps, ...props };
  const router = createMemoryRouter([
    {
      path: '/',
      element: <ProcessEditor {...allProps} />,
    },
  ]);

  return render(<RouterProvider router={router}></RouterProvider>);
};

describe('ProcessEditor', () => {
  beforeEach(jest.clearAllMocks);
  it('should render loading while bpmnXml is undefined', () => {
    renderProcessEditor({ bpmnXml: undefined });
    expect(screen.getByText(textMock('process_editor.loading'))).toBeInTheDocument();
  });

  it('should render "NoBpmnFoundAlert" when bpmnXml is null', () => {
    renderProcessEditor({ bpmnXml: null });
    expect(
      screen.getByRole('heading', {
        name: textMock('process_editor.fetch_bpmn_error_title'),
        level: 2,
      }),
    ).toBeInTheDocument();
  });

  it('does not display the information about too old version when the version is 8 or newer', async () => {
    const user = userEvent.setup();
    renderProcessEditor();

    await user.tab();

    const alertHeader = screen.queryByRole('heading', {
      name: textMock('process_editor.too_old_version_title'),
      level: 1,
    });
    expect(alertHeader).not.toBeInTheDocument();
  });
});
