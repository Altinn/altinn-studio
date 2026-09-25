import { waitFor } from '@testing-library/react';
import { app, org } from '@studio/testing/testids';
import type { SubformComponent } from 'app-shared/types/api/SubformComponent';
import { renderHookWithProviders } from '../../mocks/renderHookWithProviders';
import { useSubformComponentsQuery } from './useSubformComponentsQuery';

const subformComponents: SubformComponent[] = [
  {
    componentId: 'subform-mopeder',
    layoutSetId: 'Task_1',
    layoutName: 'utfylling',
    subformLayoutSetId: 'moped-subform',
    subformDataTypeId: 'moped',
  },
];

describe('useSubformComponentsQuery', () => {
  it('returns the subform components of the app', async () => {
    const getSubformComponents = jest.fn().mockResolvedValue(subformComponents);
    const { result } = renderHookWithProviders(() => useSubformComponentsQuery(org, app), {
      queries: { getSubformComponents },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getSubformComponents).toHaveBeenCalledWith(org, app);
    expect(result.current.data).toEqual(subformComponents);
  });
});
