import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BpmnContext, type BpmnContextProps } from '../../../../contexts/BpmnContext';
import { BpmnApiContext, type BpmnApiContextProps } from '../../../../contexts/BpmnApiContext';
import {
  mockBpmnContextValue,
  mockBpmnApiContextValue,
} from '../../../../../test/mocks/bpmnContextMock';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';
import type { BpmnDetails } from '../../../../types/BpmnDetails';

export type PdfBpmnDetailsConfig = {
  filenameTextResourceKey?: string;
  taskIds?: string[];
};

export const createPdfBpmnDetails = (config: PdfBpmnDetailsConfig = {}): BpmnDetails => {
  const { filenameTextResourceKey = '', taskIds = [] } = config;
  return {
    ...mockBpmnDetails,
    taskType: 'pdf',
    element: {
      ...mockBpmnDetails.element,
      businessObject: {
        ...mockBpmnDetails.element.businessObject,
        extensionElements: {
          values: [
            {
              pdfConfig: {
                filenameTextResourceKey: filenameTextResourceKey
                  ? { value: filenameTextResourceKey }
                  : undefined,
                autoPdfTaskIds: {
                  taskIds: taskIds.map((id) => ({ value: id })),
                },
              },
            },
          ],
        },
      },
    },
  };
};

export type RenderProps = {
  bpmnContextProps?: Partial<BpmnContextProps>;
  bpmnApiContextProps?: Partial<BpmnApiContextProps>;
};

const createRenderWrapper = (props: RenderProps = {}) => {
  const { bpmnContextProps, bpmnApiContextProps } = props;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <MemoryRouter>
      <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...bpmnApiContextProps }}>
        <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...bpmnContextProps }}>
          {children}
        </BpmnContext.Provider>
      </BpmnApiContext.Provider>
    </MemoryRouter>
  );

  return Wrapper;
};

export const renderWithProviders = (component: React.ReactElement, props: RenderProps = {}) => {
  return render(component, { wrapper: createRenderWrapper(props) });
};
