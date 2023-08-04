import React from 'react';
import { useDispatch } from 'react-redux';

import { Chip, FieldSet, Select } from '@digdir/design-system-react';
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

  const compactView = order?.length > 8;

  return (
    <FieldSet legend='Navigasjon'>
      <div className={compactView ? classes.hidden : classes.responsiveButtons}>
        <Chip.Group
          size='small'
          className={classes.chipGroup}
        >
          {order.map((page) => (
            <Chip.Toggle
              key={page}
              className={isHidden(page) ? classes.hiddenPage : undefined}
              title={isHidden(page) ? 'Denne siden er skjult for brukeren' : ''}
              onClick={() => handleChange(page)}
              selected={currentView == page}
            >
              {page}
            </Chip.Toggle>
          ))}
        </Chip.Group>
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
