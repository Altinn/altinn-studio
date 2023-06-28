import React from 'react';
import classes from './RightMenu.module.css';
import { Tabs, Checkbox } from '@digdir/design-system-react';
import { ConditionalRenderingTab } from './ConditionalRenderingTab';
import { CalculationsTab } from './CalculationsTab';
import { ContentTab } from './ContentTab';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import {DynamicsTab} from "./DynamicsTab";

export interface RightMenuProps {
  className?: string;
}

export const RightMenu = ({ className }: RightMenuProps) => {
  const { t } = useTranslation();
  const [showOldDynamics, setShowOldDynamics] = React.useState<boolean>(false);
  return (
    <div className={cn(className, classes.main)} data-testid={'ux-editor.right-menu'}>
      <Checkbox
        label={t('right_menu.show_old_dynamics')}
        name="checkbox-name"
        checked={showOldDynamics}
        onChange={() => setShowOldDynamics(!showOldDynamics)}/>
      <Tabs
        items={[
          {
            name: t('right_menu.content'),
            content: <ContentTab />,
          },
          {
            name: showOldDynamics ? t('right_menu.conditional_rendering') : t('right_menu.dynamics'),
            content: showOldDynamics ? <ConditionalRenderingTab /> : <DynamicsTab />,
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
