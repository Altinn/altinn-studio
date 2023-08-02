import React  from 'react';
import classes from './RightMenu.module.css';
import { Tabs } from '@digdir/design-system-react';
import { ConditionalRenderingTab } from './ConditionalRenderingTab';
import { CalculationsTab } from './CalculationsTab';
import { ContentTab } from './ContentTab';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { _useIsProdHack } from 'app-shared/utils/_useIsProdHack';
import { DynamicsTab } from './DynamicsTab';

export interface RightMenuProps {
  className?: string;
}

export const RightMenu = ({ className }: RightMenuProps) => {
  const { t } = useTranslation();
  const [showNewDynamics, setShowNewDynamics] = React.useState<boolean>(false);

  return (
    <div className={cn(className, classes.main)} data-testid={'ux-editor.right-menu'}>
      <Tabs
        items={[
          {
            name: t('right_menu.content'),
            content: <ContentTab isProd={_useIsProdHack()} />,
          },
          {
            name: t('right_menu.dynamics'),
            content: showNewDynamics ?
              <DynamicsTab onShowNewDynamicsTab={setShowNewDynamics} showNewDynamicsTab={showNewDynamics}/> :
              <ConditionalRenderingTab onShowNewDynamicsTab={setShowNewDynamics} showNewDynamicsTab={showNewDynamics}/>,
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
