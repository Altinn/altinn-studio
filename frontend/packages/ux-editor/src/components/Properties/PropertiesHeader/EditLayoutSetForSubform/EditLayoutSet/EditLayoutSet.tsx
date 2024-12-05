import React, { useState } from 'react';
import { CreateNewSubformSection } from './CreateNewSubformSection';
import { SubformUtilsImpl } from '@altinn/ux-editor/classes/SubformUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import type { IGenericEditComponent } from '@altinn/ux-editor/components/config/componentConfig';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { SelectSubformSection } from './SelectSubformSection/SelectSubformSection';

export const EditLayoutSet = <T extends ComponentType>({
  handleComponentChange,
  component,
}: IGenericEditComponent<T>): React.ReactElement => {
  const [showCreateSubformCard, setShowCreateSubformCard] = useState<boolean>(false);
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const subformUtils = new SubformUtilsImpl(layoutSets.sets);
  const hasSubforms = subformUtils.hasSubforms;

  const handleUpdateComponent = (subform: string) => {
    const updatedComponent = { ...component, layoutSet: subform };
    handleComponentChange(updatedComponent);
  };

  const displayCreateSubformCard = showCreateSubformCard || !hasSubforms;
  if (displayCreateSubformCard) {
    return (
      <CreateNewSubformSection
        setShowCreateSubformCard={setShowCreateSubformCard}
        onComponentUpdate={handleUpdateComponent}
        layoutSets={layoutSets}
        hasSubforms={hasSubforms}
        recommendedNextActionText={subformUtils.recommendedNextActionText}
      />
    );
  }

  return (
    <SelectSubformSection
      setShowCreateSubformCard={setShowCreateSubformCard}
      onComponentUpdate={handleUpdateComponent}
      recommendedNextActionText={subformUtils.recommendedNextActionText}
      subformLayoutSetsIds={subformUtils.subformLayoutSetsIds}
    />
  );
};
