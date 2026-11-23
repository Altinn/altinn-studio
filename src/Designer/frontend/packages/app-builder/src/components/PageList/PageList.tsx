import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioDivider, StudioHeading, StudioTag } from '@designer/components';
import { PlusIcon } from '@designer/icons';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import { usePageActions } from '../../hooks/usePageActions';
import { getPageTitle, hasSummary } from '../../utils/pageUtils';
import { readHiddenProperty } from '../../utils/ruleUtils';
import classes from './PageList.module.css';

export type PageListProps = {
  selectedPageName?: string;
  onSelectPage: (pageName: string) => void;
};

/**
 * The pages in order, with the summary page last, and buttons that add a page, or a summary page when
 * the app has none.
 */
export function PageList({ selectedPageName, onSelectPage }: PageListProps): ReactElement {
  const { t } = useTranslation();
  const { contentPageNames, summaryPageName, layouts, texts } = useAppBuilder();
  const { addPage, addSummaryPage } = usePageActions();
  // An app that sums up its answers elsewhere, such as on a page of its own, gets no second summary.
  const canAddSummary = !summaryPageName && !hasSummary(layouts);

  const openWhenAdded = async (add: () => Promise<string | undefined>): Promise<void> => {
    const pageName = await add();
    if (pageName) onSelectPage(pageName);
  };

  const renderPage = (pageName: string, number?: number): ReactElement => {
    const isSelected = pageName === selectedPageName;
    // `hidden: false` is the same as no rule, and is what new pages from the app template have.
    const { kind } = readHiddenProperty(layouts[pageName]?.data.hidden);
    const isConditional = kind === 'rule' || kind === 'advanced';
    return (
      <li key={pageName}>
        <StudioButton
          variant={isSelected ? 'secondary' : 'tertiary'}
          data-size='sm'
          className={classes.page}
          aria-current={isSelected ? 'page' : undefined}
          onClick={() => onSelectPage(pageName)}
        >
          {number !== undefined && <span className={classes.number}>{number}</span>}
          <span className={classes.name}>{getPageTitle(pageName, texts)}</span>
          {isConditional && (
            <StudioTag data-color='info' data-size='sm'>
              {t('app_builder.page.conditional')}
            </StudioTag>
          )}
        </StudioButton>
      </li>
    );
  };

  return (
    <nav className={classes.pageList} aria-label={t('app_builder.pages')}>
      <StudioHeading level={2} data-size='2xs'>
        {t('app_builder.pages')}
      </StudioHeading>
      <ul className={classes.pages}>
        {contentPageNames.map((pageName, index) => renderPage(pageName, index + 1))}
        {summaryPageName && renderPage(summaryPageName)}
      </ul>
      <StudioDivider />
      <StudioButton
        variant='tertiary'
        data-size='sm'
        icon={<PlusIcon />}
        // A new page goes after the page the user is on, so pages can be added between others.
        onClick={() => void openWhenAdded(() => addPage(selectedPageName))}
      >
        {t('app_builder.page.add')}
      </StudioButton>
      {canAddSummary && (
        <StudioButton
          variant='tertiary'
          data-size='sm'
          icon={<PlusIcon />}
          onClick={() => void openWhenAdded(addSummaryPage)}
        >
          {t('app_builder.summary.add')}
        </StudioButton>
      )}
    </nav>
  );
}
