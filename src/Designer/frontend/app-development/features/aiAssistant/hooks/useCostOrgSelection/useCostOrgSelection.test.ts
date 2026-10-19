import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import type { RenderHookResult } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { typedLocalStorage } from '@studio/pure-functions';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { AssistantCostOrg } from 'app-shared/types/api';
import { user } from 'app-shared/mocks/mocks';
import { renderHookWithProviders } from '../../../../test/mocks';
import { useCostOrgSelection } from './useCostOrgSelection';
import type { CostOrgSelectionState } from './useCostOrgSelection';

// The default test route is /testOrg/testApp.
const repositoryOwner = 'testOrg';
const storageKey = `ai-assistant-cost-org:${repositoryOwner}`;
const costOrgs: AssistantCostOrg[] = [
  { username: 'ttd', fullName: 'Testdepartementet' },
  { username: 'nfk' },
];

describe('useCostOrgSelection', () => {
  afterEach(() => typedLocalStorage.removeItem(storageKey));

  it('offers the eligible organizations and selects the first one in the user’s own repository', async () => {
    const { result } = renderUseCostOrgSelection(repositoryOwner);

    await waitFor(() => expect(result.current.costOrg).toBe('ttd'));
    expect(result.current.costOrgSelection.options).toEqual([
      { value: 'ttd', label: 'Testdepartementet' },
      { value: 'nfk', label: 'nfk' },
    ]);
    expect(result.current.costOrgSelection.selected).toBe('ttd');
  });

  it('selects and remembers the organization the user changes to', async () => {
    const { result } = renderUseCostOrgSelection(repositoryOwner);
    await waitFor(() => expect(result.current.costOrg).toBe('ttd'));

    act(() => result.current.costOrgSelection.onChange('nfk'));

    expect(result.current.costOrg).toBe('nfk');
    expect(typedLocalStorage.getItem(storageKey)).toBe('nfk');
  });

  it('selects the remembered organization when it is still eligible', async () => {
    typedLocalStorage.setItem(storageKey, 'nfk');

    const { result } = renderUseCostOrgSelection(repositoryOwner);

    await waitFor(() => expect(result.current.costOrg).toBe('nfk'));
  });

  it('ignores a remembered organization that is no longer eligible', async () => {
    typedLocalStorage.setItem(storageKey, 'ssb');

    const { result } = renderUseCostOrgSelection(repositoryOwner);

    await waitFor(() => expect(result.current.costOrg).toBe('ttd'));
  });

  it('offers no selection in an organization’s repository', async () => {
    const getAssistantCostOrgs = vi.fn().mockResolvedValue(costOrgs);
    const getUser = vi.fn().mockResolvedValue({ ...user, login: 'someoneElse' });

    const { result } = renderUseCostOrgSelection('someoneElse', { getAssistantCostOrgs, getUser });

    await waitFor(() => expect(getUser).toHaveBeenCalled());
    expect(result.current).toEqual({});
    expect(getAssistantCostOrgs).not.toHaveBeenCalled();
  });
});

const renderUseCostOrgSelection = (
  login: string,
  queries: Partial<ServicesContextProps> = {
    getUser: vi.fn().mockResolvedValue({ ...user, login }),
    getAssistantCostOrgs: vi.fn().mockResolvedValue(costOrgs),
  },
): RenderHookResult<CostOrgSelectionState, void> =>
  renderHookWithProviders(queries, new QueryClient())(() => useCostOrgSelection()).renderHookResult;
