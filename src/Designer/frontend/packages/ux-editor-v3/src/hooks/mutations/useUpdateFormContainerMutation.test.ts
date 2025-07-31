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
} from '@altinn/ux-editor-v3/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor-v3/testing/layoutSetsMock';
import { app, org } from '@studio/testing/testids';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ org, app }),
}));
import { ruleConfig as ruleConfigMock } from '../../testing/ruleConfigMock';
import type { FormLayoutsResponseV3 } from 'app-shared/types/api';
import type { RuleConfig } from 'app-shared/types/RuleConfig';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { app, org } from '@studio/testing/testids';

// Test data:
const selectedLayoutName = layout1NameMock;
const selectedLayoutSet = layoutSet1NameMock;
const maxCount = 2;
const updatedContainer: FormContainer = {
  id: 'newId',
  itemType: 'CONTAINER',
  type: ComponentTypeV3.Group,
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
                ...layout1Mock.data.layout[0],
                id: updatedContainer.id,
                maxCount,
              },
            ]),
          }),
        }),
      }),
    );
  });
});

const renderAndWaitForData = async () => {
  const getFormLayoutsV3 = jest
    .fn()
    .mockImplementation(() => Promise.resolve<FormLayoutsResponseV3>(externalLayoutsMock));
  const getRuleConfig = jest
    .fn()
    .mockImplementation(() => Promise.resolve<RuleConfig>(ruleConfigMock));
  const formLayoutsResult = renderHookWithMockStore(
    {},
    { getFormLayoutsV3 },
  )(() => useFormLayoutsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  const ruleConfigResult = renderHookWithMockStore(
    {},
    { getRuleConfig },
  )(() => useRuleConfigQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(ruleConfigResult.current.isSuccess).toBe(true));
};
