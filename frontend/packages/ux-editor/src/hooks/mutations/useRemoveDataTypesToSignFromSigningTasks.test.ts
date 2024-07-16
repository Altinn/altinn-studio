import { useRemoveDataTypesToSignFromSigningTasks } from './useRemoveDataTypesToSignFromSigningTasks';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../testing/mocks';
import { app, org } from '@studio/testing/testids';
import { getDataTypesToSignMock } from '@altinn/ux-editor/testing/bpmnDefinitionsMock';

const dataTypesToSignMock = getDataTypesToSignMock(['dataType1', 'dataType2']);
const moddle = {
  fromXML: jest.fn().mockResolvedValue({
    rootElement: dataTypesToSignMock,
  }),
  toXML: jest.fn().mockResolvedValue({ xml: '<newXml></newXml>' }),
};
jest.mock('bpmn-moddle', () => jest.fn(() => moddle));

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;

describe('useRemoveDataTypesToSignFromSigningTasks', () => {
  afterEach(jest.clearAllMocks);

  it('update the bpmn file if the deleted data types are present', async () => {
    const { result } = renderHookWithProviders(
      () => useRemoveDataTypesToSignFromSigningTasks(org, app),
      {
        queries: {
          getBpmnFile: jest.fn().mockImplementation(() => Promise.resolve(mockBPMNXML)),
        },
      },
    );

    await result.current(['dataType1']);

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
    const { result } = renderHookWithProviders(
      () => useRemoveDataTypesToSignFromSigningTasks(org, app),
      {
        queries: {
          getBpmnFile: jest.fn().mockImplementation(() => Promise.resolve(mockBPMNXML)),
        },
      },
    );

    await result.current(['dataType3']);

    expect(moddle.fromXML).toHaveBeenCalledWith(mockBPMNXML);

    expect(moddle.toXML).not.toHaveBeenCalled();
    expect(queriesMock.updateBpmnXml).not.toHaveBeenCalled();
  });
});
