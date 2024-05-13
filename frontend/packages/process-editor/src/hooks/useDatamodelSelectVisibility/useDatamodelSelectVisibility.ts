import { useState, useEffect } from 'react';
import { useBpmnContext } from '../../contexts/BpmnContext';

export const useDatamodelSelectVisibility = () => {
  const { bpmnDetails } = useBpmnContext();
  const [dataModelSelectVisible, setDataModelSelectVisible] = useState(false);

  useEffect(() => {
    setDataModelSelectVisible(false);
  }, [bpmnDetails]);

  return { dataModelSelectVisible, setDataModelSelectVisible };
};
