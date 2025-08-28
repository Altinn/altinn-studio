import React from 'react';
import { useUpdateBpmn } from './useUpdateBpmn';
import { queriesMock } from '../mocks/queriesMock';
import { app, org } from '@studio/testing/testids';
import { getDataTypesToSignMock } from '../mocks/bpmnDefinitionsMock';
import { removeDataTypeIdsToSign, updateDataTypeIdsToSign } from '../utils/bpmnUtils';
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
  afterEach(jest.clearAllMocks);

  describe('removeDataTypeIdsToSign', () => {
    it('update the bpmn file if the deleted data type ids are present', async () => {
      const { result } = renderUpdateBpmnHook();

      await result.current(removeDataTypeIdsToSign(['dataType1']));

      expect(moddle.fromXML).toHaveBeenCalledWith(mockBPMNXML);
      expect(moddle.toXML).toHaveBeenCalledWith(dataTypesToSignMock, { format: true });
      const firstDataTypeId =
        dataTypesToSignMock.rootElements[0].flowElements[0].extensionElements.values[0].$children[0]
          .$children[0].$children[0].$body;
      expect(firstDataTypeId).not.toEqual('dataType1');
      expect(queriesMock.updateBpmnXml).toHaveBeenCalled();
    });

    it('does not update the bpmn file if the deleted data type ids are not present', async () => {
      const { result } = renderUpdateBpmnHook();

      await result.current(removeDataTypeIdsToSign(['dataType3']));

      expect(moddle.fromXML).toHaveBeenCalledWith(mockBPMNXML);
      expect(moddle.toXML).not.toHaveBeenCalled();
      expect(queriesMock.updateBpmnXml).not.toHaveBeenCalled();
    });
  });

  describe('updateDataTypeIdsToSign', () => {
    afterEach(jest.clearAllMocks);

    it('update the bpmn file if the updated data type ids are present', async () => {
      const { result } = renderUpdateBpmnHook();

      await result.current(
        updateDataTypeIdsToSign([{ oldId: 'dataType2', newId: 'dataType2_new' }]),
      );

      expect(moddle.fromXML).toHaveBeenCalledWith(mockBPMNXML);
      expect(moddle.toXML).toHaveBeenCalledWith(dataTypesToSignMock, { format: true });

      const firstDataTypeId =
        dataTypesToSignMock.rootElements[0].flowElements[0].extensionElements.values[0].$children[0]
          .$children[0].$children[0].$body;
      expect(firstDataTypeId).toEqual('dataType2_new');
      expect(queriesMock.updateBpmnXml).toHaveBeenCalled();
    });

    it('does not update the bpmn file if the updated data type ids are not present', async () => {
      const { result } = renderUpdateBpmnHook();

      await result.current(
        updateDataTypeIdsToSign([{ oldId: 'dataType3', newId: 'dataType3_new' }]),
      );

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
