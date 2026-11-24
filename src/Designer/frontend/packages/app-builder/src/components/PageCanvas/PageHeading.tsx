import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useTranslation as useAppTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { StudioButton, StudioParagraph } from '@designer/components';
import { CogIcon } from '@designer/icons';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import { getPageNumber } from '../../utils/pageUtils';
import { useCanvasState } from '../CanvasState/CanvasStateContext';
import { usePageEditing } from '../PageEditing/PageEditingContext';
import classes from './PageCanvas.module.css';

/**
 * Which page this is and its name, which the user edits in place. The name is the text with the page
 * name as key, which the app's navigation and summary show.
 */
export function PageHeading(): ReactElement {
  const { t } = useTranslation();
  const { lang } = useAppTranslation();
  const { contentPageNames } = useAppBuilder();
  const { pageName, isSummaryPage: isSummary } = usePageEditing();
  const { openSettings, setOpenSettings } = useCanvasState();
  const isSettingsOpen = openSettings === 'page';

  return (
    <div className={classes.pageHeading}>
      <div className={classes.pageHeadingText}>
        <StudioParagraph data-size='xs' className={classes.pageNumber}>
          {isSummary
            ? t('app_builder.summary.kicker')
            : t('app_builder.page.number', {
                number: getPageNumber(pageName, contentPageNames),
                count: contentPageNames.length,
              })}
        </StudioParagraph>
        <span className={classes.pageName}>{lang(pageName)}</span>
      </div>
      <StudioButton
        variant='tertiary'
        data-size='sm'
        icon={<CogIcon />}
        aria-expanded={isSettingsOpen}
        onClick={() => setOpenSettings(isSettingsOpen ? undefined : 'page')}
      >
        {t('app_builder.page.settings')}
      </StudioButton>
    </div>
  );
}
