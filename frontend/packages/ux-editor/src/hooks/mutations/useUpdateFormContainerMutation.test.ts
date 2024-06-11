import { waitFor } from '@testing-library/react';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../testing/mocks';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { useRuleConfigQuery } from '../queries/useRuleConfigQuery';
import type { UpdateFormContainerMutationArgs } from './useUpdateFormContainerMutation';
import { useUpdateFormContainerMutation } from './useUpdateFormContainerMutation';
import type { FormContainer } from '../../types/FormContainer';
import {
  container1IdMock,
  externalLayoutsMock,
  layout1Mock,
  layout1NameMock,
} from '@altinn/ux-editor/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { ruleConfig as ruleConfigMock } from '../../testing/ruleConfigMock';
import type { FormLayoutsResponse } from 'app-shared/types/api';
import type { RuleConfig } from 'app-shared/types/RuleConfig';
import { ComponentType } from 'app-shared/types/ComponentType';
import { app, org } from '@studio/testing/testids';

// Test data:
const selectedLayoutName = layout1NameMock;
const selectedLayoutSet = layoutSet1NameMock;
const maxCount = 2;
const updatedContainer: FormContainer = {
  id: 'newId',
  itemType: 'CONTAINER',
  type: ComponentType.Group,
  maxCount,
};
const id = container1IdMock;
const mutationArgs: UpdateFormContainerMutationArgs = { id, updatedContainer };

describe('useUpdateFormContainerMutation', () => {
  it('Saves layouts with new container and updates rule config', async () => {
    await renderAndWaitForData();

    const updateFormContainerResult = renderHookWithProviders(() =>
      useUpdateFormContainerMutation(org, app, selectedLayoutName, selectedLayoutSet),
    ).result;

    await updateFormContainerResult.current.mutateAsync(mutationArgs);

    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayout).toHaveBeenCalledWith(
      org,
      app,
      layout1NameMock,
      selectedLayoutSet,
      {
        componentIdsChange: undefined,
        layout: expect.objectContaining({
          data: expect.objectContaining({
            layout: expect.arrayContaining([
              {
                ...layout1Mock.data.layout[0],
                id: updatedContainer.id,
                maxCount,
              },
            ]),
          }),
        }),
      },
    );
  });
});

const renderAndWaitForData = async () => {
  const getFormLayouts = jest
    .fn()
    .mockImplementation(() => Promise.resolve<FormLayoutsResponse>(externalLayoutsMock));
  const getRuleConfig = jest
    .fn()
    .mockImplementation(() => Promise.resolve<RuleConfig>(ruleConfigMock));
  const formLayoutsResult = renderHookWithProviders(
    () => useFormLayoutsQuery(org, app, selectedLayoutSet),
    { queries: { getFormLayouts } },
  ).result;
  const ruleConfigResult = renderHookWithProviders(
    () => useRuleConfigQuery(org, app, selectedLayoutSet),
    { queries: { getRuleConfig } },
  ).result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(ruleConfigResult.current.isSuccess).toBe(true));
};
