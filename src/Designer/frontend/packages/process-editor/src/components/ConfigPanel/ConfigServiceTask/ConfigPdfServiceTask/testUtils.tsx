import React from 'react';
import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { BpmnContext, type BpmnContextProps } from '../../../../contexts/BpmnContext';
import { BpmnApiContext, type BpmnApiContextProps } from '../../../../contexts/BpmnApiContext';
import {
  mockBpmnContextValue,
  mockBpmnApiContextValue,
} from '../../../../../test/mocks/bpmnContextMock';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';
import type { BpmnDetails } from '../../../../types/BpmnDetails';
import { composeWrappers, type WrapperFunction } from '@studio/testing/composeWrappers';
import { withMemoryRouter } from '@studio/testing/providerWrappers';

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

function withBpmnApiContext(
  bpmnApiContextProps: Partial<BpmnApiContextProps> = {},
): WrapperFunction {
  return (children: ReactNode) => (
    <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...bpmnApiContextProps }}>
      {children}
    </BpmnApiContext.Provider>
  );
}

function withBpmnContext(bpmnContextProps: Partial<BpmnContextProps> = {}): WrapperFunction {
  return (children: ReactNode) => (
    <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...bpmnContextProps }}>
      {children}
    </BpmnContext.Provider>
  );
}

export const renderWithProviders = (component: React.ReactElement, props: RenderProps = {}) => {
  const { bpmnContextProps, bpmnApiContextProps } = props;
  const Wrapper = composeWrappers([
    withMemoryRouter(),
    withBpmnApiContext(bpmnApiContextProps),
    withBpmnContext(bpmnContextProps),
  ]);
  return render(component, { wrapper: Wrapper });
};
