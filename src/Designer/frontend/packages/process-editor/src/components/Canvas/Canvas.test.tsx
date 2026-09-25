import { render, screen } from '@testing-library/react';
import { Canvas } from './Canvas';

jest.mock('./BPMNEditor', () => ({
  BPMNEditor: () => <div data-testid='bpmn-editor' />,
}));

describe('Canvas', () => {
  it('renders the BPMN editor', () => {
    render(<Canvas />);

    expect(screen.getByTestId('bpmn-editor')).toBeInTheDocument();
  });
});
