import type { ReactNode } from 'react';
import React, { useState } from 'react';
import type { IGenericEditComponent } from '../../componentConfig';
import { Tabs } from '@digdir/design-system-react';
import classes from './EditGrid.module.css';
import { EditGridForGivenViewSize } from './EditGridForGivenViewSize';
import { LaptopIcon, MobileIcon, MobileSmallIcon, MonitorIcon, TabletIcon } from '@studio/icons';
import type { FormComponent } from '../../../../types/FormComponent';
import { deepCopy } from 'app-shared/pure';
import { ViewSize } from './types/ViewSize';
import type { GridSizes } from './types/GridSizes';
import { useTranslation } from 'react-i18next';

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

export const EditGrid = ({ handleComponentChange, component }: IGenericEditComponent) => {
  const [gridValues, setGridValues] = useState<GridSizes>(component.grid ?? {});
  const [selectedViewSizeForGridProp, setSelectedViewSizeForGridProp] = useState<ViewSize>(
    ViewSize.Xs,
  );
  const { t } = useTranslation();

  const handleUpdateGrid = (newGridValues: GridSizes) => {
    const updatedComponent = setGridOnComponent(newGridValues, component);
    setGridValues(newGridValues);
    handleComponentChange(updatedComponent);
  };

  const iconMapping: Record<ViewSize, ReactNode> = {
    [ViewSize.Xs]: <MobileSmallIcon />,
    [ViewSize.Sm]: <MobileIcon />,
    [ViewSize.Md]: <TabletIcon />,
    [ViewSize.Lg]: <LaptopIcon />,
    [ViewSize.Xl]: <MonitorIcon />,
  };

  return (
    <Tabs
      className={classes.gridContainer}
      key={component.id}
      defaultValue={selectedViewSizeForGridProp}
      onChange={(viewSize: ViewSize) => setSelectedViewSizeForGridProp(viewSize)}
      size='small'
    >
      <Tabs.List className={classes.tabs}>
        {Object.values(ViewSize).map((viewSize: ViewSize) => {
          return (
            <Tabs.Tab
              key={viewSize}
              value={viewSize}
              icon={iconMapping[viewSize] || null}
              className={classes.tab}
            >
              {t(`ux_editor.modal_properties_grid_size_${viewSize}`)}
            </Tabs.Tab>
          );
        })}
      </Tabs.List>
      {Object.values(ViewSize).map((viewSize: ViewSize) => {
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
