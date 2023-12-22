import React, { useState } from 'react';
import { Switch } from '@digdir/design-system-react';
import { ConditionalRendering } from './ConditionalRendering';
import { Expressions } from '../config/Expressions';
import { useText } from '../../hooks';

export const Dynamics = ({ formId }) => {
  const [showOldExpressions, setShowOldExpressions] = useState<boolean>(false);
  const t = useText();

  const handleToggleOldDynamics = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowOldExpressions(event.target.checked);
  };

  const ruleHandlerExist = (window as any).conditionalRuleHandlerObject !== undefined;

  return (
    <>
      {ruleHandlerExist && (
        <Switch
          name={'new-dynamics-switch'}
          onChange={handleToggleOldDynamics}
          checked={showOldExpressions}
          size={'small'}
        >
          {t('right_menu.show_new_dynamics')}
        </Switch>
      )}
      {showOldExpressions ? <ConditionalRendering /> : <Expressions key={formId} />}
    </>
  );
};
