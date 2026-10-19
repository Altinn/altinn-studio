import { useMemo, useState } from 'react';
import type { CostOrgOption, CostOrgSelection } from '@studio/assistant';
import { typedLocalStorage } from '@studio/pure-functions';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useAssistantCostOrgsQuery } from '../../../../hooks/queries/useAssistantCostOrgsQuery';

export type CostOrgSelectionState = {
  /** The organization the user chose to pay for the usage. Undefined in an organization's repository. */
  costOrg?: string;
  costOrgSelection?: CostOrgSelection;
};

/**
 * In the user's own repository, the user chooses which organization pays for the assistant's usage.
 * The choice is remembered across sessions. In an organization's repository, the organization pays.
 */
export const useCostOrgSelection = (): CostOrgSelectionState => {
  const { org } = useStudioEnvironmentParams();
  const { data: currentUser } = useUserQuery();
  const isOwnRepository = !!currentUser && currentUser.login.toLowerCase() === org.toLowerCase();
  const { data: costOrgs } = useAssistantCostOrgsQuery(isOwnRepository);
  const [chosenCostOrg, setChosenCostOrg] = useState<string>();

  const options: CostOrgOption[] = useMemo(
    () =>
      (costOrgs ?? []).map(({ username, fullName }) => ({
        value: username,
        label: fullName || username,
      })),
    [costOrgs],
  );

  if (!isOwnRepository || options.length === 0) return {};

  const storageKey = getStorageKey(currentUser.login);
  const preferredCostOrg = chosenCostOrg ?? readStoredCostOrg(storageKey);
  const costOrg = options.some(({ value }) => value === preferredCostOrg)
    ? preferredCostOrg
    : options[0].value;

  const onChange = (newCostOrg: string): void => {
    setChosenCostOrg(newCostOrg);
    storeCostOrg(storageKey, newCostOrg);
  };

  return { costOrg, costOrgSelection: { options, selected: costOrg, onChange } };
};

const getStorageKey = (login: string): string => `ai-assistant-cost-org:${login}`;

const readStoredCostOrg = (storageKey: string): string | undefined => {
  try {
    return typedLocalStorage.getItem<string>(storageKey) ?? undefined;
  } catch {
    return undefined;
  }
};

const storeCostOrg = (storageKey: string, costOrg: string): void => {
  try {
    typedLocalStorage.setItem(storageKey, costOrg);
  } catch {
    // The choice is a convenience; it is fine to lose it when storage is unavailable.
  }
};
