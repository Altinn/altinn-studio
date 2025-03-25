import React, { useState } from 'react';
import { Expressions } from '../config/Expressions';
import { useText } from '../../hooks';
import { useFormItemContext } from '../../containers/FormItemContext';
import { formItemConfigs } from '../../data/formItemConfig';
import { UnknownComponentAlert } from '../UnknownComponentAlert';
import { DeprecatedConditionalRenderingInfo } from '@altinn/ux-editor/components/Properties/DeprecatedConditionalRenderingInfo';
import classes from './Dynamics.module.css';
import { StudioSwitch } from '@studio/components-legacy';

export const Dynamics = () => {
  const { formItemId: formId, formItem: form } = useFormItemContext();

  const [showOldExpressions, setShowOldExpressions] = useState<boolean>(false);
  const t = useText();

  const handleToggleOldDynamics = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowOldExpressions(event.target.checked);
  };

  const isUnknownInternalComponent: boolean = form && !formItemConfigs[form.type];
  if (isUnknownInternalComponent) {
    return <UnknownComponentAlert componentName={form.type} />;
  }

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
