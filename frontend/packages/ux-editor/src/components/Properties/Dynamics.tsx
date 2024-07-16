import React, { useState } from 'react';
import { Switch } from '@digdir/designsystemet-react';
import { ConditionalRendering } from './ConditionalRendering';
import { Expressions } from '../config/Expressions';
import { useText } from '../../hooks';
import type { WindowWithRuleModel } from '../../hooks/queries/useRuleModelQuery';
import { useFormItemContext } from '../../containers/FormItemContext';
import { formItemConfigs } from '../../data/formItemConfig';
import { UnknownComponentAlert } from '../UnknownComponentAlert';

export const Dynamics = () => {
  const { formItemId: formId, formItem: form } = useFormItemContext();

  const [showOldExpressions, setShowOldExpressions] = useState<boolean>(false);
  const t = useText();

  const handleToggleOldDynamics = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowOldExpressions(event.target.checked);
  };

  const conditionalRulesExist =
    (window as WindowWithRuleModel).conditionalRuleHandlerObject !== undefined;

  const isUnknownInternalComponent: boolean = form && !formItemConfigs[form.type];
  if (isUnknownInternalComponent) {
    return <UnknownComponentAlert componentName={form.type} />;
  }

  return (
    <>
      {showOldExpressions ? <ConditionalRendering /> : <Expressions key={formId} />}
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
    </>
  );
};
