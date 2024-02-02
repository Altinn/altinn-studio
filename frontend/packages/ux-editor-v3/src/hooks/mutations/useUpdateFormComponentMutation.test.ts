import { queriesMock } from 'app-shared/mocks/queriesMock';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderHookWithMockStore } from '../../testing/mocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { UpdateFormComponentMutationArgs } from './useUpdateFormComponentMutation';
import { useUpdateFormComponentMutation } from './useUpdateFormComponentMutation';
import { component1IdMock, externalLayoutsMock, layout1NameMock } from '../../testing/layoutMock';
import type {
  FormCheckboxesComponent,
  FormComponent,
  FormFileUploaderComponent,
  FormRadioButtonsComponent,
} from '../../types/FormComponent';
import type { IDataModelBindings } from '../../types/global';
import { QueryKey } from 'app-shared/types/QueryKey';
import { convertExternalLayoutsToInternalFormat } from '../../utils/formLayoutsUtils';
import { ruleConfig as ruleConfigMock } from '../../testing/ruleConfigMock';

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutName = 'Side1';
const selectedLayoutSet = 'test-layout-set';
const id = component1IdMock;
const type = ComponentType.TextArea;
const dataModelBindings: IDataModelBindings = {};
const updatedComponent: FormComponent = {
  id,
  itemType: 'COMPONENT',
  type: ComponentType.TextArea,
  dataModelBindings,
};
const defaultArgs: UpdateFormComponentMutationArgs = { id, updatedComponent };

describe('useUpdateFormComponentMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Saves layout with updated component', async () => {
    renderAndWaitForData();

    const updateFormComponentResult = renderHookWithMockStore()(() =>
      useUpdateFormComponentMutation(org, app, selectedLayoutName, selectedLayoutSet),
    ).renderHookResult.result;

    await updateFormComponentResult.current.mutateAsync(defaultArgs);

    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layout1NameMock,
      selectedLayoutSet,
      expect.objectContaining({
        data: expect.objectContaining({
          layout: expect.arrayContaining([
            {
              id,
              type,
              dataModelBindings,
            },
          ]),
        }),
      }),
    );
  });

  it('Does not run attachment metadata queries if the component type is not fileUpload', async () => {
    renderAndWaitForData();
    const updateFormComponentResult = renderHookWithMockStore()(() =>
      useUpdateFormComponentMutation(org, app, selectedLayoutName, selectedLayoutSet),
    ).renderHookResult.result;
    await updateFormComponentResult.current.mutateAsync(defaultArgs);
    expect(queriesMock.addAppAttachmentMetadata).not.toHaveBeenCalled();
    expect(queriesMock.deleteAppAttachmentMetadata).not.toHaveBeenCalled();
    expect(queriesMock.updateAppAttachmentMetadata).not.toHaveBeenCalled();
  });

  it('Updates attachment metadata queries if the component type is fileUpload', async () => {
    renderAndWaitForData();
    const updateFormComponentResult = renderHookWithMockStore()(() =>
      useUpdateFormComponentMutation(org, app, selectedLayoutName, selectedLayoutSet),
    ).renderHookResult.result;
    const newComponent: FormFileUploaderComponent = {
      ...updatedComponent,
      description: 'test',
      displayMode: 'test',
      hasCustomFileEndings: false,
      maxFileSizeInMB: 100,
      maxNumberOfAttachments: 2,
      minNumberOfAttachments: 1,
      type: ComponentType.FileUpload,
    };
    const args: UpdateFormComponentMutationArgs = {
      ...defaultArgs,
      updatedComponent: newComponent,
    };
    await updateFormComponentResult.current.mutateAsync(args);
    expect(queriesMock.updateAppAttachmentMetadata).toHaveBeenCalledTimes(1);
  });

  it('Does not keep original optionsId and options props from component when updating RadioButtons and CheckBoxes', async () => {
    renderAndWaitForData();
    const updateFormComponentResult = renderHookWithMockStore()(() =>
      useUpdateFormComponentMutation(org, app, selectedLayoutName, selectedLayoutSet),
    ).renderHookResult.result;

    for (const componentType of [ComponentType.RadioButtons, ComponentType.Checkboxes]) {
      for (const optionKind of ['options', 'optionsId']) {
        const optionsProp = optionKind === 'options' ? { options: [] } : { optionsId: 'test' };
        const newComponent = {
          ...updatedComponent,
          type: componentType,
          ...optionsProp,
        } as FormRadioButtonsComponent | FormCheckboxesComponent;

        const args: UpdateFormComponentMutationArgs = {
          ...defaultArgs,
          updatedComponent: newComponent,
        };
        await updateFormComponentResult.current.mutateAsync(args);
        expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
          org,
          app,
          layout1NameMock,
          selectedLayoutSet,
          expect.objectContaining({
            data: expect.objectContaining({
              layout: expect.arrayContaining([
                {
                  id,
                  type: componentType,
                  dataModelBindings,
                  ...optionsProp,
                },
              ]),
            }),
          }),
        );
      }
    }
  });
});

const renderAndWaitForData = () => {
  queryClientMock.setQueryData(
    [QueryKey.FormLayouts, org, app, selectedLayoutSet],
    convertExternalLayoutsToInternalFormat(externalLayoutsMock).convertedLayouts,
  );
  queryClientMock.setQueryData([QueryKey.RuleConfig, org, app, selectedLayoutSet], ruleConfigMock);
};
