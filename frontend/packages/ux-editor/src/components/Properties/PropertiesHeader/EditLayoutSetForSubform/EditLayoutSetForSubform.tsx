import React from 'react';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { IGenericEditComponent } from '@altinn/ux-editor/components/config/componentConfig';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { NoSubformLayoutsExist } from './NoSubformLayoutsExist';
import { EditLayoutSet } from './EditLayoutSet';

export const EditLayoutSetForSubform = <T extends ComponentType>({
  handleComponentChange,
  component,
}: IGenericEditComponent<T>) => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const layoutSetsThatActAsSubforms = layoutSets.sets
    .filter((set) => set.type === 'subform')
    ?.map((set) => set.id);

  const noSubformLayoutsExist = layoutSetsThatActAsSubforms.length === 0;

  const handleUpdatedLayoutSet = (layoutSet: string) => {
    const updatedComponent = { ...component, layoutSet };
    handleComponentChange(updatedComponent);
  };

  return noSubformLayoutsExist ? (
    <NoSubformLayoutsExist />
  ) : (
    <EditLayoutSet
      layoutSetsActingAsSubform={layoutSetsThatActAsSubforms}
      existingLayoutSetForSubform={component['layoutSet']}
      onUpdateLayoutSet={handleUpdatedLayoutSet}
    />
  );
};
