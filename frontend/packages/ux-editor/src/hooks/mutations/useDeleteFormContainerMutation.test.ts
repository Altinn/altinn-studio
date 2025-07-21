import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../testing/mocks';
import { useDeleteFormContainerMutation } from './useDeleteFormContainerMutation';
import {
  component1IdMock,
  component2IdMock,
  component3IdMock,
  container1IdMock,
  container2IdMock,
  externalLayoutsMock,
  layout1NameMock,
} from '@altinn/ux-editor/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { app, org } from '@studio/testing/testids';
import { componentMocks } from '../../testing/componentMocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import { getDataTypesToSignMock } from 'app-shared/mocks/bpmnDefinitionsMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { convertExternalLayoutsToInternalFormat } from '@altinn/ux-editor/utils/formLayoutsUtils';

// Test data:
const selectedLayoutSet = layoutSet1NameMock;
const id = container1IdMock;

jest.mock('bpmn-moddle', () =>
  jest.fn(() => ({
    fromXML: jest.fn().mockResolvedValue({
      rootElement: getDataTypesToSignMock([
        componentMocks[ComponentType.FileUpload].id,
        componentMocks[ComponentType.FileUploadWithTag].id,
      ]),
    }),
    toXML: jest.fn().mockResolvedValue({ xml: '<newXml></newXml>' }),
  })),
);

describe('useDeleteFormContainerMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Should save layout without deleted container and send componentIds that has been deleted for syncing', async () => {
    const { result } = await renderDeleteFormContainerMutation();
    await result.current.mutateAsync(id);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layout1NameMock,
      selectedLayoutSet,
      {
        componentIdsChange: [
          {
            oldComponentId: component1IdMock,
            newComponentId: undefined,
          },
          {
            oldComponentId: id,
            newComponentId: undefined,
          },
        ],
        layout: expect.objectContaining({
          data: expect.objectContaining({
            layout: expect.not.arrayContaining([expect.objectContaining({ id })]),
          }),
        }),
      },
    );
  });

  it('Should remove FileUpload and FileUploadWithTag data types from signing tasks', async () => {
    const { result } = await renderDeleteFormContainerMutation();

    const containerToDelete = container2IdMock;
    await result.current.mutateAsync(containerToDelete);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layout1NameMock,
      selectedLayoutSet,
      {
        componentIdsChange: [
          {
            oldComponentId: component2IdMock,
            newComponentId: undefined,
          },
          {
            oldComponentId: component3IdMock,
            newComponentId: undefined,
          },
          {
            oldComponentId: componentMocks[ComponentType.FileUploadWithTag].id,
            newComponentId: undefined,
          },
          {
            oldComponentId: containerToDelete,
            newComponentId: undefined,
          },
        ],
        layout: expect.objectContaining({
          data: expect.objectContaining({
            layout: expect.not.arrayContaining([expect.objectContaining({ containerToDelete })]),
          }),
        }),
      },
    );

    expect(queriesMock.updateBpmnXml).toHaveBeenCalledTimes(1);
  });
});

const renderDeleteFormContainerMutation = async () => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(
    [QueryKey.FormLayouts, org, app, selectedLayoutSet],
    convertExternalLayoutsToInternalFormat(externalLayoutsMock),
  );

  return renderHookWithProviders(
    () => useDeleteFormContainerMutation(org, app, selectedLayoutSet),
    { queryClient },
  );
};
