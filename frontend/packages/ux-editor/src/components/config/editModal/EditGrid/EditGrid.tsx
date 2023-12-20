import React, { useState, ReactNode } from 'react';
import type { IGenericEditComponent } from '../../componentConfig';
import { Tabs } from '@digdir/design-system-react';
import classes from './EditGrid.module.css';
import { EditGridForGivenViewSize } from './EditGridForGivenViewSize';
import { LaptopIcon, MobileSmallIcon } from '@studio/icons';
import { FormComponent } from '../../../../types/FormComponent';
import { deepCopy } from 'app-shared/pure';
import { ViewSize } from './types/ViewSize';
import { GridSizes } from './types/GridSizes';
import { useTranslation } from 'react-i18next';

const getIconForViewSize = (viewSize: ViewSize): ReactNode => {
  const iconMapping = {
    [ViewSize.xs]: <MobileSmallIcon />,
    [ViewSize.md]: <LaptopIcon />,
  };
  return iconMapping[viewSize] || null;
};

const setGridOnComponent = (gridValues: GridSizes, component: FormComponent) => {
  const newComponent = deepCopy(component);
  newComponent.grid = { ...newComponent.grid, ...gridValues };
  if (
    Object.keys(newComponent.grid).length === 0 ||
    Object.values(newComponent.grid).every((value) => value === undefined)
  ) {
    delete newComponent.grid;
  }
  return newComponent;
};

const accessibleViewsizes: ViewSize[] = [ViewSize.xs, ViewSize.md];

export const EditGrid = ({ handleComponentChange, component }: IGenericEditComponent) => {
  const [gridValues, setGridValues] = useState<GridSizes>(component.grid ?? {});
  const [selectedViewSizeForGridProp, setSelectedViewSizeForGridProp] = useState<ViewSize>(
    ViewSize.xs,
  );
  const { t } = useTranslation();

  const handleUpdateGrid = (newGridValues: GridSizes) => {
    const updatedComponent = setGridOnComponent(newGridValues, component);
    setGridValues(newGridValues);
    handleComponentChange(updatedComponent);
  };

  return (
    <Tabs
      className={classes.gridContainer}
      key={component.id}
      defaultValue={selectedViewSizeForGridProp}
      onChange={(viewSize: ViewSize) => setSelectedViewSizeForGridProp(viewSize)}
      size='small'
    >
      <Tabs.List>
        {accessibleViewsizes.map((viewSize: ViewSize) => {
          return (
            <Tabs.Tab key={viewSize} value={viewSize} icon={getIconForViewSize(viewSize)}>
              {t(`ux_editor.modal_properties_grid_size_${viewSize}`)}
            </Tabs.Tab>
          );
        })}
      </Tabs.List>
      {accessibleViewsizes.map((viewSize: ViewSize) => {
        return (
          <Tabs.Content key={viewSize} value={viewSize}>
            <EditGridForGivenViewSize
              handleUpdateGrid={(newGridValues: GridSizes) => handleUpdateGrid(newGridValues)}
              gridValues={gridValues}
              viewSize={viewSize}
            />
          </Tabs.Content>
        );
      })}
    </Tabs>
  );
};
