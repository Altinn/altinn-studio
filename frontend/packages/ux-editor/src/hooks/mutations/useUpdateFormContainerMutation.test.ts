import { waitFor } from '@testing-library/react';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithMockStore } from '../../testing/mocks';
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
} from '../../testing/layoutMock';
import { ruleConfig as ruleConfigMock } from '../../testing/ruleConfigMock';
import type { FormLayoutsResponse } from 'app-shared/types/api';
import type { RuleConfig } from 'app-shared/types/RuleConfig';

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutName = 'Side1';
const selectedLayoutSet = 'test-layout-set';
const maxCount = 2;
const updatedContainer: FormContainer = {
  id: 'newId',
  itemType: 'CONTAINER',
  maxCount,
};
const id = container1IdMock;
const mutationArgs: UpdateFormContainerMutationArgs = { id, updatedContainer };

describe('useUpdateFormContainerMutation', () => {
  it('Saves layouts with new container and updates rule config', async () => {
    await renderAndWaitForData();

    const updateFormContainerResult = renderHookWithMockStore()(() =>
      useUpdateFormContainerMutation(org, app, selectedLayoutName, selectedLayoutSet),
    ).renderHookResult.result;

    await updateFormContainerResult.current.mutateAsync(mutationArgs);

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
              ...layout1Mock.data.layout[0],
              id: updatedContainer.id,
              maxCount,
            },
          ]),
        }),
      }),
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
  const formLayoutsResult = renderHookWithMockStore(
    {},
    { getFormLayouts },
  )(() => useFormLayoutsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  const ruleConfigResult = renderHookWithMockStore(
    {},
    { getRuleConfig },
  )(() => useRuleConfigQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(ruleConfigResult.current.isSuccess).toBe(true));
};
