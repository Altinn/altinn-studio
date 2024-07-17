import React from 'react';
import { useUpdateBpmn } from './useUpdateBpmn';
import { queriesMock } from '../mocks/queriesMock';
import { app, org } from '@studio/testing/testids';
import { getDataTypesToSignMock } from '../mocks/bpmnDefinitionsMock';
import { removeDataTypesToSignFromSigningTasks } from '../utils/bpmnUtils';
import type { ServicesContextProps } from '../contexts/ServicesContext';
import { ServicesContextProvider } from '../contexts/ServicesContext';
import { renderHook } from '@testing-library/react';

const dataTypesToSignMock = getDataTypesToSignMock(['dataType1', 'dataType2']);
const moddle = {
  fromXML: jest.fn().mockResolvedValue({
    rootElement: dataTypesToSignMock,
  }),
  toXML: jest.fn().mockResolvedValue({ xml: '<newXml></newXml>' }),
};
jest.mock('bpmn-moddle', () => jest.fn(() => moddle));

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;

describe('useUpdateBpmn', () => {
  describe('removeDataTypesToSignFromSigningTasks', () => {
    afterEach(jest.clearAllMocks);

    it('update the bpmn file if the deleted data types are present', async () => {
      const { result } = renderUpdateBpmnHook();

      await result.current(removeDataTypesToSignFromSigningTasks(['dataType1']));

      expect(moddle.fromXML).toHaveBeenCalledWith(mockBPMNXML);

      const updatedDefinitions = JSON.parse(JSON.stringify(dataTypesToSignMock));
      updatedDefinitions.rootElements[0].flowElements[0].extensionElements.values[0].$children[0].$children[0].$children =
        updatedDefinitions.rootElements[0].flowElements[0].extensionElements.values[0].$children[0].$children[0].$children.filter(
          (dataType) => dataType.$body !== 'dataType1',
        );

      expect(moddle.toXML).toHaveBeenCalledWith(updatedDefinitions, { format: true });

      expect(queriesMock.updateBpmnXml).toHaveBeenCalled();
    });

    it('does not update the bpmn file if the deleted data types are not present', async () => {
      const { result } = renderUpdateBpmnHook();

      await result.current(removeDataTypesToSignFromSigningTasks(['dataType3']));

      expect(moddle.fromXML).toHaveBeenCalledWith(mockBPMNXML);

      expect(moddle.toXML).not.toHaveBeenCalled();
      expect(queriesMock.updateBpmnXml).not.toHaveBeenCalled();
    });
  });
});

const renderUpdateBpmnHook = () => {
  const queries: Partial<ServicesContextProps> = {
    ...queriesMock,
    getBpmnFile: jest.fn().mockImplementation(() => Promise.resolve(mockBPMNXML)),
  };

  return renderHook(() => useUpdateBpmn(org, app), {
    wrapper: ({ children }) => (
      <ServicesContextProvider {...queries}>{children}</ServicesContextProvider>
    ),
  });
};
