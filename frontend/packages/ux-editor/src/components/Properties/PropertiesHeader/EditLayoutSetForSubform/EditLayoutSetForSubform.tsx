import React from 'react';
import { EditLayoutSet } from './EditLayoutSet';
import { NoSubformLayoutsExist } from './NoSubformLayoutsExist';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { SubformUtilsImpl } from '../../../../classes/SubFormUtils';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { IGenericEditComponent } from '../../../../components/config/componentConfig';

export const EditLayoutSetForSubform = <T extends ComponentType>({
  handleComponentChange,
  component,
}: IGenericEditComponent<T>): React.ReactElement => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  const subformUtils = new SubformUtilsImpl(layoutSets.sets);

  if (!subformUtils.hasSubforms) {
    return <NoSubformLayoutsExist />;
  }

  const handleUpdatedLayoutSet = (layoutSet: string): void => {
    const updatedComponent = { ...component, layoutSet };
    handleComponentChange(updatedComponent);
  };

  return (
    <EditLayoutSet
      existingLayoutSetForSubform={component['layoutSet']}
      onUpdateLayoutSet={handleUpdatedLayoutSet}
    />
  );
};
