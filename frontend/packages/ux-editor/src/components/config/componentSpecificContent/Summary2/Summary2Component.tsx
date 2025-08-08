import React from 'react';
import type { IGenericEditComponent } from '../../componentConfig';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { Summary2Override } from './Override/Summary2Override';
import { Summary2Target } from './Summary2Target/Summary2Target';
import type { Summary2TargetConfig } from 'app-shared/types/ComponentSpecificConfig';

type Summary2ComponentProps = IGenericEditComponent<ComponentType.Summary2> & {
  className?: string;
};

export const Summary2Component = ({
  component,
  handleComponentChange,
  className,
}: Summary2ComponentProps): JSX.Element => {
  const handleTargetChange = (updatedTarget: Summary2TargetConfig): void => {
    const updatedComponent = { ...component };
    updatedComponent.target = updatedTarget;
    handleComponentChange(updatedComponent);
  };

  return (
    <>
      <Summary2Target
        target={component.target}
        onChange={handleTargetChange}
        className={className}
      />
      <Summary2Override
        component={component}
        onChange={handleComponentChange}
        className={className}
      />
    </>
  );
};
