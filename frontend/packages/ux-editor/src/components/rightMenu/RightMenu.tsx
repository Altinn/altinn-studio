import React from 'react';
import classes from './RightMenu.module.css';
import { Tabs } from '@digdir/design-system-react';
import { ConditionalRenderingTab } from './ConditionalRenderingTab';
import { CalculationsTab } from './CalculationsTab';
import { ContentTab } from './ContentTab';
import { useTranslation } from 'react-i18next';

export const RightMenu = () => {
  const { t } = useTranslation();
  return (
    <div className={classes.main} data-testid={'ux-editor.right-menu'}>
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
