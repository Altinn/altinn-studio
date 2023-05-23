import React from 'react';

import { ToggleButton, ToggleButtonGroup } from '@altinn/altinn-design-system';
import { FieldSet } from '@digdir/design-system-react';

import { DevToolsActions } from 'src/features/devtools/data/devToolsSlice';
import { useComponentRefs } from 'src/features/devtools/hooks/useComponentRefs';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useExprContext } from 'src/utils/layout/ExprContext';
import type { IDevToolsState } from 'src/features/devtools/data/types';

const pseudoHiddenCssFilter = 'contrast(0.75)';

export function DevHiddenFunctionality() {
  const state = useAppSelector((state) => state.devTools.hiddenComponents);
  const hierarchy = useExprContext();
  const dispatch = useAppDispatch();

  useComponentRefs({
    callback: (id, ref) => {
      const node = hierarchy?.findById(id);
      if (node) {
        if (ref.style.filter === pseudoHiddenCssFilter && state !== 'disabled') {
          ref.style.filter = '';
        } else if (state === 'disabled' && node.isHidden(true, false)) {
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
    <FieldSet legend='Skjulte komponenter'>
      <div>
        <ToggleButtonGroup
          onChange={({ selectedValue }) =>
            dispatch(
              DevToolsActions.setShowHiddenComponents({
                value: selectedValue as IDevToolsState['hiddenComponents'],
              }),
            )
          }
          selectedValue={state}
        >
          <ToggleButton value={'hide'}>Skjul</ToggleButton>
          <ToggleButton value={'disabled'}>Vis som deaktivert</ToggleButton>
          <ToggleButton value={'show'}>Vis</ToggleButton>
        </ToggleButtonGroup>
      </div>
    </FieldSet>
  );
}
