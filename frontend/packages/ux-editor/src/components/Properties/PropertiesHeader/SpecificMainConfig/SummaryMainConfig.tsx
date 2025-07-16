import React from 'react';
import type { FormItem } from '../../../../types/FormItem';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { Summary2TargetConfig } from 'app-shared/types/ComponentSpecificConfig';
import { Summary2Target } from '../../../config/componentSpecificContent/Summary2/Summary2Target/Summary2Target';

export type SummaryMainConfigProps = {
  component: FormItem<ComponentType.Summary2>;
  handleComponentChange: (component: FormItem) => void;
  className?: string;
};

export const SummaryMainConfig = ({
  component,
  handleComponentChange,
  className,
}: SummaryMainConfigProps) => {
  const handleTargetChange = (updatedTarget: Summary2TargetConfig): void => {
    const updatedComponent = { ...component } as FormItem<ComponentType.Summary2>;
    updatedComponent.target = updatedTarget;
    updatedComponent.overrides = [];
    handleComponentChange(updatedComponent);
  };

  return (
    <Summary2Target target={component.target} onChange={handleTargetChange} className={className} />
  );
};
