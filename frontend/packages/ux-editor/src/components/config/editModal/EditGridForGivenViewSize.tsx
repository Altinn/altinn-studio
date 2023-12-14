import React, { useState } from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { StudioSlider } from '@studio/components';
import { Paragraph, Switch } from '@digdir/design-system-react';
import { ViewSizeForGridProp } from './EditGrid';
import { PadlockLockedFillIcon } from '@navikt/aksel-icons';
import classes from './EditGridForGivenViewSize.module.css';

export interface EditGridForGivenViewSizeProps extends IGenericEditComponent {
  viewSize: ViewSizeForGridProp;
  useDefaultGridSize: boolean;
}

export const EditGridForGivenViewSize = ({
  viewSize,
  useDefaultGridSize,
  handleComponentChange,
  component,
}: EditGridForGivenViewSizeProps) => {
  const t = useText();
  const [useDefault, setUseDefault] = useState<boolean>(useDefaultGridSize);

  const DEFAULT_GRID_VALUE = '12';

  const handleSliderChange = (newValue: string) => {
    const newGridObject = viewSize === ViewSizeForGridProp.S ? { xs: newValue } : { md: newValue };
    handleComponentChange({
      ...component,
      grid: {
        ...component.grid,
        ...newGridObject,
      },
    });
  };

  const handleSwitchChange = () => {
    // call function to mutate component on new ref
    if (useDefault) {
      handleSliderChange(DEFAULT_GRID_VALUE);
    } else {
      if (viewSize === ViewSizeForGridProp.S) delete component.grid?.xs;
      if (viewSize === ViewSizeForGridProp.M) delete component.grid?.md;
      if (Object.keys(component.grid).length === 0) delete component.grid;
      handleComponentChange(component);
    }
    setUseDefault(!useDefault);
  };

  return (
    <>
      <div className={classes.lockIcon}>
        {useDefault && <PadlockLockedFillIcon title='lockIcon' fontSize='1.5rem' />}
        <Paragraph size='small'>{t('ux_editor.modal_properties_grid')}</Paragraph>
      </div>

      <StudioSlider
        disabled={useDefault}
        sliderValue={viewSize === ViewSizeForGridProp.S ? component.grid?.xs : component.grid?.md}
        handleSliderChange={(newValue) => handleSliderChange(newValue)}
      />
      <Switch checked={useDefault} onChange={handleSwitchChange} size='small'>
        {t('ux_editor.modal_properties_grid_use_default')}
      </Switch>
    </>
  );
};
