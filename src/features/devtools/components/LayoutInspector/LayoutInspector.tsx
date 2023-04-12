import React from 'react';

import classes from 'src/features/devtools/components/LayoutInspector/LayoutInspector.module.css';
import { LayoutInspectorItem } from 'src/features/devtools/components/LayoutInspector/LayoutInspectorItem';
import { useAppSelector } from 'src/hooks/useAppSelector';

export const LayoutInspector = () => {
  const { currentView } = useAppSelector((state) => state.formLayout.uiConfig);
  const layouts = useAppSelector((state) => state.formLayout.layouts);

  const currentLayout = layouts?.[currentView];

  return (
    <div className={classes.container}>
      <ul className={classes.list}>
        {currentLayout?.map((component) => (
          <LayoutInspectorItem
            key={component.id}
            component={component}
          />
        ))}
      </ul>
    </div>
  );
};
