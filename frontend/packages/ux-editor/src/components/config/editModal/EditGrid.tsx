import React, { useState } from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { StudioSlider } from '@studio/components';
import { Paragraph, Switch, ToggleGroup } from '@digdir/design-system-react';
import { FormField } from '../../FormField';
import classes from './EditGrid.module.css';

enum ViewSizeForGridProp {
  S = 'xs',
  M = 'md',
}

export const EditGrid = ({ handleComponentChange, component }: IGenericEditComponent) => {
  const defaultViewSize = ViewSizeForGridProp.M;
  const [viewSizeForGridProp, setViewSizeForGridProp] =
    useState<ViewSizeForGridProp>(defaultViewSize);
  const [useDefaultGridSize, setUseDefaultGridSize] = useState<boolean>(
    (viewSizeForGridProp === ViewSizeForGridProp.S && !component.grid?.xs) ||
      (viewSizeForGridProp === ViewSizeForGridProp.M && !component.grid?.md),
  );
  const t = useText();

  const handleSliderChange = (newValue: string) => {
    const newGridObject =
      viewSizeForGridProp === ViewSizeForGridProp.S ? { xs: newValue } : { md: newValue };
    handleComponentChange({
      ...component,
      grid: {
        ...component.grid,
        ...newGridObject,
      },
    });
  };

  const handleSwitchChange = () => {
    setUseDefaultGridSize(!useDefaultGridSize);
    // call function to mutate component on new ref
    if (viewSizeForGridProp === ViewSizeForGridProp.S) delete component.grid?.xs;
    if (viewSizeForGridProp === ViewSizeForGridProp.M) delete component.grid?.md;
    handleComponentChange(component);
  };

  return (
    <FormField
      id={component.id}
      value={component.grid}
      onChange={handleSliderChange}
      propertyPath={component.propertyPath}
      componentType={component.type}
      helpText={t('ux_editor.modal_properties_grid_help')}
      renderField={({ fieldProps }) => {
        return (
          <>
            <div className={classes.toggleGroupContainer}>
              <ToggleGroup
                defaultValue={viewSizeForGridProp}
                name='toggle-group-grid-size'
                onChange={(viewSize: ViewSizeForGridProp) => setViewSizeForGridProp(viewSize)}
                size='small'
              >
                <ToggleGroup.Item value={ViewSizeForGridProp.S}>
                  {t('ux_editor.modal_properties_grid_size_xs')}
                </ToggleGroup.Item>
                <ToggleGroup.Item value={ViewSizeForGridProp.M}>
                  {t('ux_editor.modal_properties_grid_size_md')}
                </ToggleGroup.Item>
              </ToggleGroup>
            </div>
            <Paragraph size='small'>{t('ux_editor.modal_properties_grid')}</Paragraph>
            <StudioSlider
              disabled={useDefaultGridSize}
              sliderValue={
                viewSizeForGridProp === ViewSizeForGridProp.S
                  ? component.grid?.xs
                  : component.grid?.md
              }
              handleSliderChange={(newValue) => handleSliderChange(newValue)}
            />
            <Switch checked={useDefaultGridSize} onChange={handleSwitchChange} size='small'>
              {t('ux_editor.modal_properties_grid_use_default')}
            </Switch>
          </>
        );
      }}
    />
  );
};
