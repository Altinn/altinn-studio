import React, { useEffect } from 'react';
import { StudioToggleableTextfield } from '@studio/components';
import { useBpmnContext } from '../../contexts/BpmnContext';

export const TaskIdTextfield = (): React.ReactElement => {
  const { bpmnDetails, setBpmnDetails, modelerRef } = useBpmnContext();
  const modeler = modelerRef.current;
  const modeling: any = modeler.get('modeling');

  const [idValue, setIdValue] = React.useState(bpmnDetails.id);

  useEffect(() => {
    setIdValue(bpmnDetails.id);
  }, [bpmnDetails.id]);

  const updateId = (value: string) => {
    modeling.updateProperties(bpmnDetails.element, {
      id: value,
    });
    setBpmnDetails({
      ...bpmnDetails,
      id: value,
    });
  };

  if (!bpmnDetails || !bpmnDetails.id) return null;

  return (
    <StudioToggleableTextfield
      inputProps={{
        label: 'Endre task id',
        icon: <div />,
        value = { idValue },
        onChange: (event) => setIdValue(event.target.value),
        onBlur: (event) => updateId(event.target.value),
      }}
      viewProps={{}}
    />
  );
};
