import { useState } from 'react';
import type { FormItem } from '../../../types/FormItem';
import { useComponentPropertyLabel } from '../../../hooks';

type UseConfigProperty = {
  initialComponent: FormItem;
  propertyKey: string;
};

export const useConfigProperty = ({ initialComponent, propertyKey }: UseConfigProperty) => {
  const initialPropertyValue = initialComponent[propertyKey];
  const [currentPropertyValue, setCurrentPropertyValue] = useState(initialPropertyValue);
  const componentPropertyLabel = useComponentPropertyLabel();
  const currentComponent = { ...initialComponent, [propertyKey]: currentPropertyValue };

  const handleComponentChange = (updatedComponent: FormItem) => {
    setCurrentPropertyValue(updatedComponent[propertyKey]);
  };

  return {
    initialPropertyValue,
    currentPropertyValue,
    setCurrentPropertyValue,
    currentComponent,
    handleComponentChange,
    propertyLabel: componentPropertyLabel(propertyKey),
  };
};
