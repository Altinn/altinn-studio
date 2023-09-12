import React  from 'react';
import { Viewer } from './Canvas';
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
    useBpmnViewer: jest.fn(() => ({
      renderNoDiagramError: true, 
      renderNoProcessError: true, 
      canvasRef: jest.fn(),
    })),
  }));

  describe('Viewer Component', () => {
    it('renders the Alert component when there is no diagram', () => {
      render(<Viewer />);
      expect(screen.getByTestId("no_diagram")).toBeInTheDocument();
    });

    it('renders the Alert component when there is no process', () => {
      render(<Viewer />);
      expect(screen.getByTestId("no_process")).toBeInTheDocument();
    });

    it('renders the Alert component when there is no diagram and process', () => {
      render(<Viewer />);
      expect(screen.getByTestId("no_diagram")).toBeInTheDocument();
      expect(screen.getByTestId("no_process")).toBeInTheDocument();
    });

    it('does not render the Alert component when there is diagram and process', () => {
      renderNoDiagramError.mockReturnValue(false);
      renderNoProcessError.mockReturnValue(false);
      render(<Viewer />);
      expect(screen.queryByText("no_diagram")).not.toBeInTheDocument();
      expect(screen.queryByText("no_process")).not.toBeInTheDocument();
    });
  });

