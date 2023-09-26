import React from 'react';
import classes from './PagesOverview.module.css';
import { PageAccordion } from './PageAccordion';
import { Button, Heading } from '@digdir/design-system-react';
import { PlusIcon } from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';
import { useFormLayoutsQuery } from '../../hooks/queries/useFormLayoutsQuery';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { FormLayout } from './types';

// TODO remove the following imports:
import { selectedLayoutSetSelector } from '../../selectors/formLayoutSelectors';
import { useSelector } from 'react-redux';

export const PagesOverview = () => {
  const { t } = useTranslation();

  const { org, app } = useStudioUrlParams();
  const selectedLayoutSet = useSelector(selectedLayoutSetSelector);

  // Get the pages with components
  const { data: formLayoutData } = useFormLayoutsQuery(org, app, selectedLayoutSet);

  // TODO - Need to sort this?
  const mappedFormLayoutData: FormLayout[] = Object.entries(formLayoutData)
    .map(([key, value]) => ({
      page: key,
      data: value,
    }))
    .sort((a, b) => a.page.localeCompare(b.page));

  // console.log('data', mappedFormLayoutData);

  const addPage = () => {};

  const displayPagesOverview = mappedFormLayoutData.map((formLayout: FormLayout, i) => {
    return <PageAccordion formLayout={formLayout} key={i} />;
  });

  return (
    <div className={classes.wrapper}>
      {displayPagesOverview}
      <div>
        <Button icon={<PlusIcon />} onClick={() => {}} size='small'>
          {t('left_menu.layout_sets_add')}
        </Button>
      </div>
    </div>
  );
};
