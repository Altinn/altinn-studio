import React from 'react';
import { useText } from '../../../../hooks';
import type { GridSize } from '@studio/components';
import { PadlockLockedFillIcon } from '@studio/icons';
import classes from './EditGridForGivenViewSize.module.css';
import { ObjectUtils } from '@studio/pure-functions';
import type { GridSizes } from './types/GridSizes';
import type { ViewSize } from './types/ViewSize';
import { findEffectiveGridSize } from './utils';
import { StudioGridSelector, StudioSwitch, StudioParagraph } from '@studio/components';

export interface EditGridForGivenViewSizeProps {
  handleUpdateGrid: (newGridValues: GridSizes) => void;
  gridValues: GridSizes;
  viewSize: ViewSize;
}

const setGridValueOnViewSize = (viewSize: ViewSize, gridValues: GridSizes, newGridValue) => {
  const newGridValues = ObjectUtils.deepCopy(gridValues);
  newGridValues[viewSize] = newGridValue;
  return newGridValues;
};

const DEFAULT_GRID_VALUE: GridSize = 12;

export const EditGridForGivenViewSize = ({
  handleUpdateGrid,
  gridValues,
  viewSize,
}: EditGridForGivenViewSizeProps) => {
  const t = useText();

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
        <StudioParagraph data-size='sm'>{t('ux_editor.modal_properties_grid')}</StudioParagraph>
        {!gridValues[viewSize] && <PadlockLockedFillIcon title='lockIcon' fontSize='1.5rem' />}
      </div>
      <StudioGridSelector
        disabled={!gridValues[viewSize]}
        sliderValue={findEffectiveGridSize(gridValues, viewSize)}
        handleSliderChange={(newValue) => {
          const newGridObject = setGridValueOnViewSize(viewSize, gridValues, Number(newValue));
          handleUpdateGrid(newGridObject);
        }}
      />
      <StudioSwitch
        data-size='sm'
        checked={!gridValues[viewSize]}
        onChange={handleSwitchChange}
        label={t('ux_editor.modal_properties_grid_use_default')}
      />
    </>
  );
};
