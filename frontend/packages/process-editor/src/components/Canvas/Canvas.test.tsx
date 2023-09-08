import React  from 'react';
import { Canvas } from './Canvas';
import { render , screen } from '@testing-library/react';
import BpmnJs from 'bpmn-js/dist/bpmn-navigated-viewer.production.min';

const renderNoDiagramError = jest.fn();
const renderNoProcessError = jest.fn(); 

const mockBpmn = {
  get: jest.fn().mockReturnValue({
    zoom: jest.fn(),
    stepZoom: jest.fn(),
    add: jest.fn(),
    onSave: jest.fn(),
  }),
  destroy: jest.fn(),
  on: jest.fn(),
  importXML: jest.fn(),
};    

jest.mock('bpmn-js/dist/bpmn-navigated-viewer.production.min')
  BpmnJs.mockImplementation(() => mockBpmn);

jest.mock('../../hooks/useBpmnViewer', () => ({
  useBpmnViewer: () => ({
    canvasRef: { current: null },
    renderNoDiagramError: false,
    renderNoProcessError: false,
  }),
}));

describe('Canvas', () => {
  it('should render Canvas', () => {
    const { container } = render(<Canvas onSave={() => {}} />);
    expect(container).toMatchSnapshot();
  });

  it('should not render the alert when there are diagram and process', async () => {
    render(<Canvas onSave={() => {}} />);
    renderNoDiagramError.mockReturnValue(false);
    renderNoProcessError.mockReturnValue(false);
    expect(screen.queryByText('process_editor.not_found_diagram_heading')).not.toBeInTheDocument();
    expect(screen.queryByText('process_editor.not_found_diagram_error_message')).not.toBeInTheDocument();
  });

});