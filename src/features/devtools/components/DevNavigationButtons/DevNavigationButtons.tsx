import React from 'react';
import { useDispatch } from 'react-redux';

import { FieldSet, Select, ToggleButtonGroup } from '@digdir/design-system-react';
import cn from 'classnames';

import classes from 'src/features/devtools/components/DevNavigationButtons/DevNavigationButtons.module.css';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { useAppSelector } from 'src/hooks/useAppSelector';

export const DevNavigationButtons = () => {
  const { currentView, tracks } = useAppSelector((state) => state.formLayout.uiConfig);
  const dispatch = useDispatch();

  function handleChange(newView: string) {
    dispatch(FormLayoutActions.updateCurrentView({ newView, allowNavigationToHidden: true }));
  }

  function isHidden(page: string) {
    return tracks?.hidden.includes(page);
  }

  const order = tracks?.order ?? [];
  if (!order?.length) {
    return null;
  }

  const compactView = order?.length > 5;

  return (
    <FieldSet legend='Navigasjon'>
      <div className={compactView ? classes.hidden : classes.responsiveButtons}>
        <ToggleButtonGroup
          onChange={(selectedValue) => handleChange(selectedValue)}
          selectedValue={currentView}
          items={order?.map((page) => ({
            value: page,
            label: (
              <span
                className={isHidden(page) ? classes.hiddenPage : classes.visiblePage}
                title={isHidden(page) ? 'Denne siden er skjult for brukeren' : ''}
              >
                {page}
              </span>
            ),
          }))}
        />
      </div>
      <div className={cn(classes.dropdown, { [classes.responsiveDropdown]: !compactView })}>
        <Select
          value={currentView}
          options={
            order?.map((page) => ({
              value: page,
              label: page,
              formattedLabel: (
                <span
                  className={tracks?.hidden.includes(page) ? classes.hiddenPage : classes.visiblePage}
                  title={isHidden(page) ? 'Denne siden er skjult for brukeren' : ''}
                >
                  {page}
                </span>
              ),
            })) ?? []
          }
          onChange={handleChange}
        />
      </div>
    </FieldSet>
  );
};
