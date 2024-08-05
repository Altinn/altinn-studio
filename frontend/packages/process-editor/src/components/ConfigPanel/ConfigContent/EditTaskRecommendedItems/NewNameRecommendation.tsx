import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { StudioIconTextfield, StudioRecommendedNextAction } from '@studio/components';
import { KeyVerticalIcon } from '@studio/icons';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import React, { useState } from 'react';

interface NewNameRecommendationProps {}

export const NewNameRecommendation = ({}: NewNameRecommendationProps): React.ReactElement => {
  const [recommendedActionNewName, setRecommendedActioNewName] = useState('');
  const { bpmnDetails, setBpmnDetails, modelerRef } = useBpmnContext();
  const modelerInstance = modelerRef.current;
  const modeling: Modeling = modelerInstance.get('modeling');

  return (
    <StudioRecommendedNextAction
      title='Gi oppgaven et navn'
      description='Du finner lettere igjen oppgaven på Lage-siden, hvis du gir den et eget navn. Hvis du velger Hopp over, får oppgaven en tilfeldig navn. Du kan endre navnet senere.'
      validForm={recommendedActionNewName !== ''}
      onSave={() => {
        modeling.updateProperties(bpmnDetails.element, {
          id: recommendedActionNewName,
        });
        setBpmnDetails({
          ...bpmnDetails,
          id: recommendedActionNewName,
          metadata: { justAdded: false },
        });
      }}
      onSkip={() => {
        setBpmnDetails({ ...bpmnDetails, metadata: { justAdded: false } });
      }}
    >
      <StudioIconTextfield
        icon={<KeyVerticalIcon />}
        size='sm'
        label='Navn på oppgaven'
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setRecommendedActioNewName(event.target.value);
        }}
        value={recommendedActionNewName}
      ></StudioIconTextfield>
    </StudioRecommendedNextAction>
  );
};
