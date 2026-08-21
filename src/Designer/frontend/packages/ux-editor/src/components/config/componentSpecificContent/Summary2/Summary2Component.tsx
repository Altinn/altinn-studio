import type { IGenericEditComponent } from '../../componentConfig';
import type { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import { Summary2Override } from './Override/Summary2Override';
import { Summary2Target } from './Summary2Target/Summary2Target';
import type { Summary2TargetConfig } from '@altinn/ux-editor/types/Summary2Config';

import type { JSX } from 'react';

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
