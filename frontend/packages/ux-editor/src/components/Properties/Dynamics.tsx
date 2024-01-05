import React, { useState } from 'react';
import { Switch } from '@digdir/design-system-react';
import { ConditionalRendering } from './ConditionalRendering';
import { Expressions } from '../config/Expressions';
import { useText } from '../../hooks';
import { WindowWithRuleModel } from '../../hooks/queries/useRuleModelQuery';

interface DynamicsProps {
  formId: string;
}

export const Dynamics = ({ formId }: DynamicsProps) => {
  const [showOldExpressions, setShowOldExpressions] = useState<boolean>(false);
  const t = useText();

  const handleToggleOldDynamics = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowOldExpressions(event.target.checked);
  };

  const conditionalRulesExist =
    (window as WindowWithRuleModel).conditionalRuleHandlerObject !== undefined;

  return (
    <>
      {conditionalRulesExist && (
        <Switch
          name={'new-dynamics-switch'}
          onChange={handleToggleOldDynamics}
          checked={showOldExpressions}
          size={'small'}
        >
          {t('right_menu.show_old_dynamics')}
        </Switch>
      )}
      {showOldExpressions ? <ConditionalRendering /> : <Expressions key={formId} />}
    </>
  );
};
