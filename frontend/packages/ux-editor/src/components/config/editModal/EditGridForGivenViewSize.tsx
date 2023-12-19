import React from 'react';
import { useText } from '../../../hooks';
import { StudioSlider } from '@studio/components';
import { Paragraph, Switch } from '@digdir/design-system-react';
import { PadlockLockedFillIcon } from '@navikt/aksel-icons';
import classes from './EditGridForGivenViewSize.module.css';
import { GridSizeForViewSize, ViewSizeForGridProp } from './EditGrid';
import { deepCopy } from 'app-shared/pure';

export interface EditGridForGivenViewSizeProps {
  handleUpdateGrid: (newGridValues: GridSizeForViewSize) => void;
  gridValues: GridSizeForViewSize;
  viewSize: ViewSizeForGridProp;
}

const setGridValueOnViewSize = (
  viewSize: ViewSizeForGridProp,
  gridValues: GridSizeForViewSize,
  newGridValue,
) => {
  const newGridValues = deepCopy(gridValues);
  newGridValues[viewSize] = newGridValue;
  return newGridValues;
};

export const EditGridForGivenViewSize = ({
  handleUpdateGrid,
  gridValues,
  viewSize,
}: EditGridForGivenViewSizeProps) => {
  const t = useText();

  const DEFAULT_GRID_VALUE = 12;

  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newGridObject = setGridValueOnViewSize(
      viewSize,
      gridValues,
      e.target.checked ? undefined : DEFAULT_GRID_VALUE,
    );
    handleUpdateGrid(newGridObject);
  };

  return (
    <>
      <div className={classes.lockIcon}>
        <Paragraph size='small'>{t('ux_editor.modal_properties_grid')}</Paragraph>
        {!gridValues[viewSize] && <PadlockLockedFillIcon title='lockIcon' fontSize='1.5rem' />}
      </div>

      <StudioSlider
        disabled={!gridValues[viewSize]}
        sliderValue={gridValues[viewSize]}
        handleSliderChange={(newValue) => {
          const newGridObject = setGridValueOnViewSize(viewSize, gridValues, Number(newValue));
          handleUpdateGrid(newGridObject);
        }}
      />
      <Switch checked={!gridValues[viewSize]} onChange={handleSwitchChange} size='small'>
        {t('ux_editor.modal_properties_grid_use_default')}
      </Switch>
    </>
  );
};
