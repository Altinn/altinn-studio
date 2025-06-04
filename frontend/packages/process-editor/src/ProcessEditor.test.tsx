import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ProcessEditorProps } from './ProcessEditor';
import { ProcessEditor } from './ProcessEditor';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;

const mockAppLibVersion8: string = '8.0.3';

const defaultProps: ProcessEditorProps = {
  bpmnXml: mockBPMNXML,
  saveBpmn: jest.fn(),
  appLibVersion: mockAppLibVersion8,
  availableDataTypeIds: [],
  availableDataModelIds: [],
  allDataModelIds: [],
  layoutSets: { sets: [] },
  pendingApiOperations: false,
  existingCustomReceiptLayoutSetId: undefined,
  addLayoutSet: jest.fn(),
  deleteLayoutSet: jest.fn(),
  mutateLayoutSetId: jest.fn(),
  mutateDataTypes: jest.fn(),
  onProcessTaskRemove: jest.fn(),
  onProcessTaskAdd: jest.fn(),
};

const renderProcessEditor = (bpmnXml: string) => {
  const allProps = { ...defaultProps, bpmnXml };
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
    renderProcessEditor(undefined);
    expect(screen.getByText(textMock('process_editor.loading'))).toBeInTheDocument();
  });

  it('should render "NoBpmnFoundAlert" when bpmnXml is null', () => {
    renderProcessEditor(null);
    expect(
      screen.getByRole('heading', {
        name: textMock('process_editor.fetch_bpmn_error_title'),
        level: 1,
      }),
    ).toBeInTheDocument();
  });

  it('does not display the information about too old version when the version is 8 or newer', async () => {
    const user = userEvent.setup();
    renderProcessEditor(mockBPMNXML);

    await user.tab();

    const alertHeader = screen.queryByRole('heading', {
      name: textMock('process_editor.too_old_version_title'),
      level: 1,
    });
    expect(alertHeader).not.toBeInTheDocument();
  });
});
