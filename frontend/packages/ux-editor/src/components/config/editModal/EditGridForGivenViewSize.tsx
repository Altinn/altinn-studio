import React from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { StudioSlider } from '@studio/components';
import { Paragraph, Switch } from '@digdir/design-system-react';
import { ViewSizeForGridProp } from './EditGrid';

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
    if (useDefaultGridSize) {
      handleSliderChange(DEFAULT_GRID_VALUE);
    } else {
      if (viewSize === ViewSizeForGridProp.S) delete component.grid?.xs;
      if (viewSize === ViewSizeForGridProp.M) delete component.grid?.md;
      if (component.grid?.keys?.length === 0) delete component.grid;
      handleComponentChange(component);
    }
  };

  return (
    <>
      <Paragraph size='small'>{t('ux_editor.modal_properties_grid')}</Paragraph>
      <StudioSlider
        disabled={useDefaultGridSize}
        sliderValue={viewSize === ViewSizeForGridProp.S ? component.grid?.xs : component.grid?.md}
        handleSliderChange={(newValue) => handleSliderChange(newValue)}
      />
      <Switch checked={useDefaultGridSize} onChange={handleSwitchChange} size='small'>
        {t('ux_editor.modal_properties_grid_use_default')}
      </Switch>
    </>
  );
};
