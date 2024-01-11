import React from 'react';

import { Fieldset, ToggleGroup } from '@digdir/design-system-react';

import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { useComponentRefs } from 'src/features/devtools/hooks/useComponentRefs';
import { useNodes } from 'src/utils/layout/NodesContext';
import type { IDevToolsState } from 'src/features/devtools/data/types';

const pseudoHiddenCssFilter = 'contrast(0.75)';

export function DevHiddenFunctionality() {
  const state = useDevToolsStore((state) => state.hiddenComponents);
  const setShowHiddenComponents = useDevToolsStore((state) => state.actions.setShowHiddenComponents);
  const hierarchy = useNodes();

  useComponentRefs({
    callback: (id, ref) => {
      const node = hierarchy?.findById(id);
      if (node) {
        if (ref.style.filter === pseudoHiddenCssFilter && state !== 'disabled') {
          ref.style.filter = '';
        } else if (state === 'disabled' && node.isHidden({ respectDevTools: false })) {
          ref.style.filter = pseudoHiddenCssFilter;
        }
      }
    },
    cleanupCallback: (_, ref) => {
      if (ref.style.filter === pseudoHiddenCssFilter) {
        ref.style.filter = '';
      }
    },
  });

  return (
    <Fieldset legend='Skjulte komponenter'>
      <div>
        <ToggleGroup
          size='small'
          onChange={(selectedValue) => setShowHiddenComponents(selectedValue as IDevToolsState['hiddenComponents'])}
          value={state}
        >
          <ToggleGroup.Item value='hide'>Skjul</ToggleGroup.Item>
          <ToggleGroup.Item value='disabled'>Utgrået</ToggleGroup.Item>
          <ToggleGroup.Item value='show'>Vis</ToggleGroup.Item>
        </ToggleGroup>
      </div>
    </Fieldset>
  );
}
