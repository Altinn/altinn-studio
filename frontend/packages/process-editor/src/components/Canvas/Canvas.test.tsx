import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Canvas } from './Canvas';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { type BpmnContextProviderProps, useBpmnContext } from '../../contexts/BpmnContext';
import { BpmnContextProvider } from '../../contexts/BpmnContext';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';

jest.mock('../../contexts/BpmnContext', () => ({
  ...jest.requireActual('../../contexts/BpmnContext'),
  useBpmnContext: jest.fn(),
}));

const mockOnSave = jest.fn();

const mockAppLibVersion8: string = '8.0.1';
const mockAppLibVersion7: string = '7.0.1';

const defaultProps: BpmnContextProviderProps = {
  appLibVersion: mockAppLibVersion8,
  bpmnXml: '',
  children: null,
};

const renderCanvas = (props: Partial<BpmnContextProviderProps> = {}) => {
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

  return render(<RouterProvider router={router}></RouterProvider>);
};

describe('Canvas', () => {
  beforeEach(jest.clearAllMocks);

  it('hides actionMenu when version is 7 or older', async () => {
    (useBpmnContext as jest.Mock).mockReturnValue({
      ...jest.requireActual('../../contexts/BpmnContext'),
    });
    const user = userEvent.setup();
    renderCanvas({ appLibVersion: mockAppLibVersion7 });

    // Fix to remove act error
    await act(() => user.tab());

    const editButton = screen.queryByRole('button', { name: textMock('process_editor.save') });
    expect(editButton).not.toBeInTheDocument;
  });

  it('should call onSave when save button is clicked', async () => {
    const getUpdatedXmlMock = jest.fn().mockResolvedValue('<bpmn>xml</bpmn>');
    (useBpmnContext as jest.Mock).mockReturnValue({
      ...jest.requireActual('../../contexts/BpmnContext'),
      getUpdatedXml: getUpdatedXmlMock,
      isEditAllowed: true,
      modelerRef: {
        current: { saveXML: jest.fn().mockResolvedValue({ xml: '<bpmn>xml</bpmn>' }) },
      },
    });
    const user = userEvent.setup();
    renderCanvas({ appLibVersion: mockAppLibVersion8 });

    const saveButton = screen.getByRole('button', { name: textMock('process_editor.save') });
    await act(() => user.click(saveButton));

    expect(getUpdatedXmlMock).toHaveBeenCalled();
    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });
});
