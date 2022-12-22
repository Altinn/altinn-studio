import classes from './Variables.module.css';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  PanelVariant,
  PopoverPanel,
} from '@altinn/altinn-design-system';
import { InformationColored } from '@navikt/ds-icons';
import React from 'react';
import type { TextResourceVariable } from './types';

export type VariablesProps = {
  variables: TextResourceVariable[];
  infoboxOpen: boolean;
  setInfoboxOpen: (open: boolean) => void;
};

export const Variables = ({ variables, infoboxOpen, setInfoboxOpen }: VariablesProps) => {
  return (
    <div title={'Det er ikke lagt til støtte for redigering av variabler i Studio.'}>
      {variables.map((variable) => (
        <div key={variable.key} className={classes.chip}>
          {`${variable.key}: ${variable.dataSource}`}
        </div>
      ))}
      {variables.length > 0 && (
        <span className={classes.infoButton}>
          <PopoverPanel
            title={'Kun for visning'}
            variant={PanelVariant.Info}
            trigger={
              <Button
                icon={<InformationColored />}
                variant={ButtonVariant.Quiet}
                size={ButtonSize.Small}
              />
            }
            open={infoboxOpen}
            onOpenChange={setInfoboxOpen}
          >
            <div>Det er ikke mulig å redigere variabler i Studio.</div>
          </PopoverPanel>
        </span>
      )}
    </div>
  );
};
