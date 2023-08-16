import React from 'react';
import { useDispatch } from 'react-redux';

import { Chip, FieldSet, Select } from '@digdir/design-system-react';
import cn from 'classnames';

import classes from 'src/features/devtools/components/DevNavigationButtons/DevNavigationButtons.module.css';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useExprContext } from 'src/utils/layout/ExprContext';

export const DevNavigationButtons = () => {
  const { currentView, tracks } = useAppSelector((state) => state.formLayout.uiConfig);
  const ctx = useExprContext();
  const dispatch = useDispatch();
  const order = tracks?.order ?? [];
  const allPages = ctx?.allPageKeys() || [];

  function handleChange(newView: string) {
    dispatch(FormLayoutActions.updateCurrentView({ newView, allowNavigationToHidden: true }));
  }

  function isHidden(page: string) {
    return tracks?.hidden.includes(page);
  }

  function isHiddenLegacy(page: string) {
    // Checks if not in order
    return !order.includes(page);
  }

  function isHiddenAny(page: string) {
    return isHidden(page) || isHiddenLegacy(page);
  }

  function hiddenText(page: string) {
    if (isHidden(page)) {
      return 'Denne siden er skjult for brukeren (via dynamikk)';
    }
    if (isHiddenLegacy(page)) {
      return 'Denne siden er skjult for brukeren (via sporvalg)';
    }
    return '';
  }

  if (!allPages.length) {
    return null;
  }

  // Order allPages by order
  const orderedPages = allPages.sort((a, b) => {
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);
    if (aIndex === -1 && bIndex === -1) {
      return 0;
    }
    if (aIndex === -1) {
      return 1;
    }
    if (bIndex === -1) {
      return -1;
    }
    return aIndex - bIndex;
  });

  const compactView = allPages.length > 8;

  return (
    <FieldSet legend='Navigasjon'>
      <div className={compactView ? classes.hidden : classes.responsiveButtons}>
        <Chip.Group
          size='small'
          className={classes.chipGroup}
        >
          {orderedPages.map((page) => (
            <Chip.Toggle
              key={page}
              className={isHiddenAny(page) ? classes.hiddenPage : undefined}
              title={hiddenText(page)}
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
                  className={isHiddenAny(page) ? classes.hiddenPage : classes.visiblePage}
                  title={hiddenText(page)}
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
