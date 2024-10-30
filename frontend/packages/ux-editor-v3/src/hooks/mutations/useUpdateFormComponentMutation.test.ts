import { queriesMock } from 'app-shared/mocks/queriesMock';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderHookWithMockStore } from '../../testing/mocks';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import type { UpdateFormComponentMutationArgs } from './useUpdateFormComponentMutation';
import { useUpdateFormComponentMutation } from './useUpdateFormComponentMutation';
import {
  component1IdMock,
  externalLayoutsMock,
  layout1NameMock,
} from '@altinn/ux-editor-v3/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor-v3/testing/layoutSetsMock';
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
import { app, org } from '@studio/testing/testids';

// Test data:
const selectedLayoutName = layout1NameMock;
const selectedLayoutSet = layoutSet1NameMock;
const id = component1IdMock;
const type = ComponentTypeV3.TextArea;
const dataModelBindings: IDataModelBindings = {};
const updatedComponent: FormComponent = {
  id,
  itemType: 'COMPONENT',
  type: ComponentTypeV3.TextArea,
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

    expect(queriesMock.saveFormLayoutV3).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayoutV3).toHaveBeenCalledWith(
      org,
      app,
      layout1NameMock,
      selectedLayoutSet,
      expect.objectContaining({
        layout: expect.objectContaining({
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
      type: ComponentTypeV3.FileUpload,
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

    for (const componentType of [ComponentTypeV3.RadioButtons, ComponentTypeV3.Checkboxes]) {
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
        expect(queriesMock.saveFormLayoutV3).toHaveBeenCalledWith(
          org,
          app,
          layout1NameMock,
          selectedLayoutSet,
          expect.objectContaining({
            layout: expect.objectContaining({
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
