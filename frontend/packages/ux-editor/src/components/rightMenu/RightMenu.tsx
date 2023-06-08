import React from 'react';
import classes from './RightMenu.module.css';
import { Tabs } from '@digdir/design-system-react';
import { ConditionalRenderingTab } from './ConditionalRenderingTab';
import { CalculationsTab } from './CalculationsTab';
import { ContentTab } from './ContentTab';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';

export interface RightMenuProps {
  className?: string;
}

export const RightMenu = ({ className }: RightMenuProps) => {
  const { t } = useTranslation();
  return (
    <div className={cn(className, classes.main)} data-testid={'ux-editor.right-menu'}>
      <Tabs
        items={[
          {
            name: t('right_menu.content'),
            content: <ContentTab />,
          },
          {
            name: t('right_menu.conditional_rendering'),
            content: <ConditionalRenderingTab />,
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
