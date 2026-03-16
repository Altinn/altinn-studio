import React from 'react';

import { Fieldset, ToggleGroup } from '@digdir/designsystemet-react';

import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { useIsInFormContext } from 'src/features/form/FormContext';
import type { IDevToolsState } from 'src/features/devtools/data/types';

export function DevHiddenFunctionality() {
  const isInForm = useIsInFormContext();
  if (!isInForm) {
    return null;
  }

  return <InnerDevHiddenFunctionality />;
}

function InnerDevHiddenFunctionality() {
  const state = useDevToolsStore((state) => state.hiddenComponents);
  const setShowHiddenComponents = useDevToolsStore((state) => state.actions.setShowHiddenComponents);

  return (
    <Fieldset>
      <Fieldset.Legend>Skjulte komponenter</Fieldset.Legend>
      <div>
        <ToggleGroup
          data-size='sm'
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
