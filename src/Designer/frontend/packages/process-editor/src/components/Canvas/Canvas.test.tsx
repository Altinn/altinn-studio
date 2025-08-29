import React from 'react';
import { render, screen } from '@testing-library/react';
import { Canvas } from './Canvas';
import { type BpmnContextProviderProps, useBpmnContext } from '../../contexts/BpmnContext';
import { BpmnContextProvider } from '../../contexts/BpmnContext';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { textMock } from '@studio/testing/mocks/i18nMock';

jest.mock('../../contexts/BpmnContext', () => ({
  ...jest.requireActual('../../contexts/BpmnContext'),
  useBpmnContext: jest.fn(),
}));

const mockAppLibVersion8: string = '8.0.1';
const mockAppLibVersion7: string = '7.0.1';

const defaultProps: BpmnContextProviderProps = {
  appLibVersion: mockAppLibVersion8,
  bpmnXml: '',
  children: null,
};

jest.mock('./BPMNViewer', () => ({
  BPMNViewer: () => <div data-testid='bpmn-viewer' />,
}));

jest.mock('./BPMNEditor', () => ({
  BPMNEditor: () => <div data-testid='bpmn-editor' />,
}));

const renderCanvas = (props: Partial<BpmnContextProviderProps> = {}) => {
  const allProps = { ...defaultProps, ...props };
  const router = createMemoryRouter([
    {
      path: '/',
      element: (
        <BpmnContextProvider {...allProps}>
          <Canvas />
        </BpmnContextProvider>
      ),
    },
  ]);

  return render(<RouterProvider router={router}></RouterProvider>);
};

describe('Canvas', () => {
  it('should render bpmn viewer when app lib version is lower than 8', () => {
    (useBpmnContext as jest.Mock).mockReturnValue({
      ...jest.requireActual('../../contexts/BpmnContext'),
    });
    renderCanvas({ appLibVersion: mockAppLibVersion7 });
    screen.queryByTestId('bpmn-viewer');
  });
  it('should render bpmn editor when app lib version is 8 or higher', () => {
    (useBpmnContext as jest.Mock).mockReturnValue({
      ...jest.requireActual('../../contexts/BpmnContext'),
    });
    renderCanvas({ appLibVersion: mockAppLibVersion8 });
    screen.queryByTestId('bpmn-editor');
  });
  it('displays the alert when the version is 7 or older', async () => {
    (useBpmnContext as jest.Mock).mockReturnValue({
      ...jest.requireActual('../../contexts/BpmnContext'),
    });
    renderCanvas({ appLibVersion: mockAppLibVersion7 });
    const tooOldText = screen.getByText(textMock('process_editor.too_old_version_title'));
    expect(tooOldText).toBeInTheDocument();
  });
});
