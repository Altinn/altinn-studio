import React, { useState } from 'react';
import { Expressions } from '../config/Expressions';
import { useText } from '../../hooks';
import { useFormItemContext } from '../../containers/FormItemContext';
import { DeprecatedConditionalRenderingInfo } from '@altinn/ux-editor/components/Properties/DeprecatedConditionalRenderingInfo';
import classes from './Dynamics.module.css';
import { StudioSwitch } from '@studio/components-legacy';

export const Dynamics = () => {
  const { formItemId: formId } = useFormItemContext();

  const [showOldExpressions, setShowOldExpressions] = useState<boolean>(false);
  const t = useText();

  const handleToggleOldDynamics = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowOldExpressions(event.target.checked);
  };

  return (
    <>
      {showOldExpressions ? <DeprecatedConditionalRenderingInfo /> : <Expressions key={formId} />}
      <StudioSwitch
        name={'new-dynamics-switch'}
        onChange={handleToggleOldDynamics}
        checked={showOldExpressions}
        size={'sm'}
        className={classes.oldDynamicsToggle}
      >
        {t('right_menu.show_old_dynamics')}
      </StudioSwitch>
    </>
  );
};
