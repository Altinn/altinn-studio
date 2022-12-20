import React from 'react';
import classes from './RightMenu.module.css';
import type { LogicMode } from '../../types/global';
import { Tabs } from '@altinn/altinn-design-system';
import { ConditionalRenderingTab } from './ConditionalRenderingTab';
import { CalculationsTab } from './CalculationsTab';

export interface IRightMenuProps {
  language: object;
  toggleFileEditor: (mode?: LogicMode) => void;
}

export const RightMenu = ({language, toggleFileEditor}: IRightMenuProps) => (
  <div className={classes.main}>
    <Tabs
      items={[
        {
          name: 'Vis/skjul',
          content: <ConditionalRenderingTab language={language} toggleFileEditor={toggleFileEditor} />,
        },
        {
          name: 'Beregninger',
          content: <CalculationsTab language={language} toggleFileEditor={toggleFileEditor} />,
        }
      ]}
    />
  </div>
);
