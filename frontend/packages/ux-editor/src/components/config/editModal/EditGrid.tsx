import React, { useState, ReactNode } from 'react';
import type { IGenericEditComponent } from '../componentConfig';
import { useText } from '../../../hooks';
import { Tabs } from '@digdir/design-system-react';
import { FormField } from '../../FormField';
import classes from './EditGrid.module.css';
import { EditGridForGivenViewSize } from './EditGridForGivenViewSize';
import { LaptopIcon, MobileSmallIcon } from '@navikt/aksel-icons';

export enum ViewSizeForGridProp {
  S = 'xs',
  M = 'md',
}

const getIconForViewSize = (viewSize: ViewSizeForGridProp): ReactNode => {
  const iconMapping = {
    [ViewSizeForGridProp.S]: <MobileSmallIcon />,
    [ViewSizeForGridProp.M]: <LaptopIcon />,
  };

  // Return the icon based on the viewSize
  return iconMapping[viewSize] || null; // Default to null if viewSize is not found
};

export const EditGrid = ({ handleComponentChange, component }: IGenericEditComponent) => {
  const getDefaultViewSize = (): ViewSizeForGridProp => {
    if (component.grid?.md) return ViewSizeForGridProp.M;
    if (component.grid?.xs) return ViewSizeForGridProp.S;
    return ViewSizeForGridProp.M;
  };
  const [viewSizeForGridProp, setViewSizeForGridProp] = useState<ViewSizeForGridProp>(
    getDefaultViewSize(),
  );

  const t = useText();

  const gridIsSetForViewSize = (viewSize: ViewSizeForGridProp): boolean =>
    viewSize === ViewSizeForGridProp.S ? !!component.grid?.xs : !!component.grid?.md;

  return (
    <FormField
      className={classes.gridContainer}
      id={component.id}
      value={component.grid}
      propertyPath={component.propertyPath}
      componentType={component.type}
      helpText={t('ux_editor.modal_properties_grid_help')}
      renderField={() => (
        <Tabs
          defaultValue={viewSizeForGridProp}
          onChange={(viewSize: ViewSizeForGridProp) => setViewSizeForGridProp(viewSize)}
          size='small'
        >
          <Tabs.List className={classes.viewSizesTabs}>
            {Object.values(ViewSizeForGridProp).map((viewSize) => {
              return (
                <Tabs.Tab key={viewSize} value={viewSize} icon={getIconForViewSize(viewSize)}>
                  {t(`ux_editor.modal_properties_grid_size_${viewSize}`)}
                </Tabs.Tab>
              );
            })}
          </Tabs.List>
          {Object.values(ViewSizeForGridProp).map((viewSize) => {
            return (
              <Tabs.Content key={viewSize} value={viewSize}>
                <EditGridForGivenViewSize
                  viewSize={viewSize}
                  useDefaultGridSize={!gridIsSetForViewSize(viewSize)}
                  handleComponentChange={handleComponentChange}
                  component={component}
                />
              </Tabs.Content>
            );
          })}
        </Tabs>
      )}
    />
  );
};
