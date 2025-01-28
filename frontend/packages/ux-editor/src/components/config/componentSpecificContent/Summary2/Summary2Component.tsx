import React from 'react';
import type { IGenericEditComponent } from '../../componentConfig';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { Summary2Override } from './Override/Summary2Override';
import { Summary2Target } from './Summary2Target/Summary2Target';
import type {
  Summary2OverrideConfig,
  Summary2TargetConfig,
} from 'app-shared/types/ComponentSpecificConfig';

export const Summary2Component = ({
  component,
  handleComponentChange,
}: IGenericEditComponent<ComponentType.Summary2>) => {
  const overrides: Summary2OverrideConfig[] = component.overrides;
  const target: Summary2TargetConfig = component.target;

  const handleTargetChange = (updatedTarget: Summary2TargetConfig): void => {
    const updatedComponent = { ...component };
    updatedComponent.target = updatedTarget;
    handleComponentChange(updatedComponent);
  };

  const handleOverridesChange = (updatedOverrides: Summary2OverrideConfig[]): void => {
    const updatedComponent = { ...component };
    updatedComponent.overrides = updatedOverrides;
    handleComponentChange(updatedComponent);
  };

  return (
    <>
      <Summary2Target target={target} onChange={handleTargetChange} />
      <Summary2Override overrides={overrides} target={target} onChange={handleOverridesChange} />
    </>
  );
};
