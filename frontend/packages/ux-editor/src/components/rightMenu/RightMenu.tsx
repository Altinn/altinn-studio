import React from 'react';
import classes from './RightMenu.module.css';
import { Tabs, Checkbox } from '@digdir/design-system-react';
import { ConditionalRenderingTab } from './ConditionalRenderingTab';
import { CalculationsTab } from './CalculationsTab';
import { ContentTab } from './ContentTab';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { DynamicsTab } from './DynamicsTab';
import { _useIsProdHack } from 'app-shared/utils/_useIsProdHack';

export interface RightMenuProps {
  className?: string;
}

export const RightMenu = ({ className }: RightMenuProps) => {
  const { t } = useTranslation();
  const [showNewDynamics, setShowNewDynamics] = React.useState<boolean>(false);
  return (
    <div className={cn(className, classes.main)} data-testid={'ux-editor.right-menu'}>
      { !_useIsProdHack() &&
        <Checkbox
          label={t('right_menu.show_new_dynamics')}
          name={'checkbox-name'}
          checked={showNewDynamics}
          onChange={() => setShowNewDynamics(!showNewDynamics)}/>}
      <Tabs
        items={[
          {
            name: t('right_menu.content'),
            content: <ContentTab />,
          },
          {
            name: showNewDynamics ?  t('right_menu.dynamics') : t('right_menu.conditional_rendering'),
            content: showNewDynamics ? <DynamicsTab /> : <ConditionalRenderingTab />,
          },
          {
            name: t('right_menu.calculations'),
            content: <CalculationsTab />,
          },
        ]}
      />
    </div>
  );
};
