import React from 'react';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { IGenericEditComponent } from '@altinn/ux-editor/components/config/componentConfig';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { NoSubFormLayoutsExist } from './NoSubFormLayoutsExist/NoSubFormLayoutsExist';
import { EditLayoutSet } from './EditLayoutSet/EditLayoutSet';

export const EditLayoutSetForSubForm = <T extends ComponentType>({
  handleComponentChange,
  component,
}: IGenericEditComponent<T>) => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const layoutSetsThatActAsSubForms = layoutSets.sets
    .filter((set) => set.type === 'subform')
    ?.map((set) => set.id);

  const noSubFormLayoutsExist = layoutSetsThatActAsSubForms.length === 0;

  const handleUpdatedLayoutSet = (layoutSet: string) => {
    const updatedComponent = { ...component, layoutSet };
    handleComponentChange(updatedComponent);
  };

  return noSubFormLayoutsExist ? (
    <NoSubFormLayoutsExist />
  ) : (
    <EditLayoutSet
      layoutSetsActingAsSubForm={layoutSetsThatActAsSubForms}
      existingLayoutSetForSubForm={component['layoutSet']}
      onUpdateLayoutSet={handleUpdatedLayoutSet}
    />
  );
};
