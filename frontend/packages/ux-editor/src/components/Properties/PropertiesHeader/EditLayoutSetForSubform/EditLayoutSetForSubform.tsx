import React from 'react';
import { EditLayoutSet } from './EditLayoutSet';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { IGenericEditComponent } from '../../../../components/config/componentConfig';
import { DefinedLayoutSet } from './EditLayoutSet/DefinedLayoutSet/DefinedLayoutSet';

export const EditLayoutSetForSubform = <T extends ComponentType>({
  handleComponentChange,
  component,
}: IGenericEditComponent<T>): React.ReactElement => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  const existingLayoutSetForSubform = component['layoutSet'];
  if (existingLayoutSetForSubform) {
    return <DefinedLayoutSet existingLayoutSetForSubform={existingLayoutSetForSubform} />;
  }

  const handleUpdatedLayoutSet = (layoutSet: string): void => {
    const updatedComponent = { ...component, layoutSet };
    handleComponentChange(updatedComponent);
  };

  return (
    <EditLayoutSet
      existingLayoutSetForSubform={existingLayoutSetForSubform}
      onUpdateLayoutSet={handleUpdatedLayoutSet}
      layoutSets={layoutSets}
    />
  );
};
