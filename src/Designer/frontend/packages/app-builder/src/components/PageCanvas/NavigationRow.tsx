import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationButtons } from '@app/form-component';
import { useTranslation as useAppTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { StudioButton, StudioParagraph } from '@designer/components';
import { PlusIcon } from '@designer/icons';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import { usePageActions } from '../../hooks/usePageActions';
import { getPageNumber, getSubmitButtonTextKey, hasNavigationButtons } from '../../utils/pageUtils';
import { usePageEditing } from '../PageEditing/PageEditingContext';
import classes from './PageCanvas.module.css';

/**
 * The buttons at the bottom of the page: Previous and Next, or Previous and the submit button on the
 * summary page. The label of the submit button is edited in place. A page without Previous and Next
 * says so, and offers to add them, rather than having them added behind the user's back.
 */
export function NavigationRow(): ReactElement | null {
  const { t } = useTranslation();
  const { lang } = useAppTranslation();
  const { contentPageNames, summaryPageName, layouts } = useAppBuilder();
  const { pageName, layout, isSummaryPage: isSummary } = usePageEditing();
  const { addNavigationButtonsTo } = usePageActions();
  const submitTextKey = isSummary ? getSubmitButtonTextKey(layout) : undefined;
  const hasButtons = hasNavigationButtons(layout);
  const allPageNames = summaryPageName ? [...contentPageNames, summaryPageName] : contentPageNames;
  const pagesWithoutButtons = allPageNames.filter((name) => !hasNavigationButtons(layouts[name]));

  if (!hasButtons && !submitTextKey && allPageNames.length < 2) return null;

  return (
    <div className={classes.navigationRow}>
      {(hasButtons || submitTextKey) && (
        <div className={classes.navigationButtons}>
          {hasButtons && (
            <NavigationButtons
              componentId={`${pageName}-navigation-preview`}
              showPrevious={isSummary || getPageNumber(pageName, contentPageNames) > 1}
              showNext={!isSummary}
            />
          )}
          {submitTextKey && (
            // A div that looks like the button, since a button cannot hold text that is edited.
            <div className='ds-button' data-variant='primary' data-size='sm'>
              {lang(submitTextKey)}
            </div>
          )}
        </div>
      )}
      {!hasButtons && allPageNames.length > 1 && (
        <div className={classes.missingNavigation}>
          <StudioParagraph data-size='sm' className={classes.navigationCaption}>
            {t('app_builder.navigation.missing')}
          </StudioParagraph>
          <StudioButton
            variant='secondary'
            data-size='sm'
            icon={<PlusIcon />}
            onClick={() => addNavigationButtonsTo([pageName])}
          >
            {t('app_builder.navigation.add')}
          </StudioButton>
          {pagesWithoutButtons.length > 1 && (
            <StudioButton
              variant='tertiary'
              data-size='sm'
              onClick={() => addNavigationButtonsTo(pagesWithoutButtons)}
            >
              {t('app_builder.navigation.add_to_all', { count: pagesWithoutButtons.length })}
            </StudioButton>
          )}
        </div>
      )}
    </div>
  );
}
