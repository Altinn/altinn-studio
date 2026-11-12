import React from 'react';

import { render, screen } from '@testing-library/react';

import { ComponentErrorBoundary } from 'src/utils/layout/ComponentErrorBoundary';

const state = vi.hoisted(() => ({ pdf: false, addError: vi.fn() }));
vi.mock('src/hooks/useIsPdf', () => ({ useIsPdf: () => state.pdf }));
vi.mock('src/features/form/FormContext', () => ({
  FormStore: { layoutDiagnostics: { useAddError: () => state.addError } },
}));

const failure = new Error('Component render failed');
function BrokenComponent(): React.ReactNode {
  throw failure;
}
class DocumentBoundary extends React.Component<React.PropsWithChildren, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error ? <div role='alert'>{this.state.error.message}</div> : this.props.children;
  }
}

describe('ComponentErrorBoundary', () => {
  it.each([false, true])('propagates component errors to the document only in PDF mode: %s', (pdf) => {
    state.pdf = pdf;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(window, 'logError').mockImplementation(() => {});
    render(
      <DocumentBoundary>
        <ComponentErrorBoundary nodeId='broken'>
          <BrokenComponent />
        </ComponentErrorBoundary>
        <div id='readyForPrint' />
      </DocumentBoundary>,
    );
    if (pdf) {
      expect(screen.getByRole('alert')).toHaveTextContent(failure.message);
      expect(document.getElementById('readyForPrint')).toBeNull();
    } else {
      expect(screen.queryByRole('alert')).toBeNull();
      expect(state.addError).toHaveBeenCalledWith(failure.message, 'broken', 'node');
      expect(document.getElementById('readyForPrint')).not.toBeNull();
    }
    vi.restoreAllMocks();
  });
});
