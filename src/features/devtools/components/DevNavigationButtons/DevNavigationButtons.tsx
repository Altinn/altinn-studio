import React from 'react';

import { Chip, Combobox, Fieldset } from '@digdir/designsystemet-react';
import cn from 'classnames';

import classes from 'src/features/devtools/components/DevNavigationButtons/DevNavigationButtons.module.css';
import { useIsInFormContext } from 'src/features/form/FormContext';
import { useLayouts } from 'src/features/form/layout/LayoutsContext';
import { useLayoutSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { useNavigationParam } from 'src/features/routing/AppRoutingContext';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import comboboxClasses from 'src/styles/combobox.module.css';
import { Hidden } from 'src/utils/layout/NodesContext';

export function DevNavigationButtons() {
  const isInForm = useIsInFormContext();
  if (!isInForm) {
    return null;
  }

  return <InnerDevNavigationButtons />;
}

const InnerDevNavigationButtons = () => {
  const pageKey = useNavigationParam('pageKey');
  const { navigateToPage } = useNavigatePage();
  const isHiddenPage = Hidden.useIsHiddenPageSelector();
  const orderWithHidden = useLayoutSettings().pages.order;
  const order = orderWithHidden ?? [];
  const allPages = Object.keys(useLayouts() ?? {});

  function handleChange(values: string[]) {
    const newView = values.at(0);
    if (newView) {
      navigateToPage(newView);
    }
  }

  function isHidden(page: string) {
    return isHiddenPage(page) || !orderWithHidden.includes(page);
  }

  function hiddenText(page: string) {
    if (isHiddenPage(page)) {
      return 'Denne siden er skjult for brukeren (via dynamikk)';
    } else if (!orderWithHidden.includes(page)) {
      return 'Denne siden er ikke med i siderekkefølgen';
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
    <Fieldset legend='Navigasjon'>
      <div className={compactView ? classes.hidden : classes.responsiveButtons}>
        <Chip.Group
          size='small'
          className={classes.chipGroup}
        >
          {orderedPages.map((page) => (
            <Chip.Toggle
              key={page}
              className={isHidden(page) ? classes.hiddenPage : undefined}
              title={hiddenText(page)}
              // TODO(DevTools): Navigate to hidden pages is not working
              disabled={isHidden(page)}
              onClick={() => handleChange([page])}
              selected={pageKey == page}
            >
              {page}
            </Chip.Toggle>
          ))}
        </Chip.Group>
      </div>
      <div className={cn(classes.dropdown, { [classes.responsiveDropdown]: !compactView })}>
        <Combobox
          size='sm'
          value={[pageKey!]}
          onValueChange={handleChange}
          className={comboboxClasses.container}
        >
          {order?.map((page) => (
            <Combobox.Option
              key={page}
              value={page}
              displayValue={page}
            >
              <span
                className={isHidden(page) ? classes.hiddenPage : undefined}
                title={hiddenText(page)}
              >
                {page}
              </span>
            </Combobox.Option>
          ))}
        </Combobox>
      </div>
    </Fieldset>
  );
};
