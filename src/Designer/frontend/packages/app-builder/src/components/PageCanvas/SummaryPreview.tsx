import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { SingleValueSummaryLayout } from '@app/form-component';
import { StudioButton, StudioHeading } from '@designer/components';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import { hasAnswer, getTextKey } from '../../utils/componentUtils';
import { getPageTitle } from '../../utils/pageUtils';
import { PlainTextsProvider } from '../EditorTranslator/PlainTextsProvider';
import classes from './PageCanvas.module.css';

const emptyAnswerKey = 'app-builder.empty-answer';

export type SummaryPreviewProps = {
  onSelectPage: (pageName: string) => void;
};

/**
 * What the summary shows: a section for each page with the questions on it. The answers are not
 * known while building, so each says where its answer will be.
 */
export function SummaryPreview({ onSelectPage }: SummaryPreviewProps): ReactElement {
  const { t } = useTranslation();
  const { contentPageNames, layouts, texts } = useAppBuilder();

  return (
    <PlainTextsProvider texts={{ [emptyAnswerKey]: t('app_builder.summary.empty_answer') }}>
      <div className={classes.summary}>
        {contentPageNames.map((pageName) => (
          <section key={pageName} className={classes.summarySection}>
            <div className={classes.summarySectionHeading}>
              <StudioHeading level={3} data-size='xs'>
                {getPageTitle(pageName, texts)}
              </StudioHeading>
              <StudioButton
                variant='tertiary'
                data-size='sm'
                onClick={() => onSelectPage(pageName)}
              >
                {t('app_builder.summary.change')}
              </StudioButton>
            </div>
            <div className={classes.summaryRows}>
              {layouts[pageName].data.layout.filter(hasAnswer).map((component) => (
                <SingleValueSummaryLayout
                  key={component.id}
                  title={getTextKey(component, 'title')}
                  emptyFieldText={emptyAnswerKey}
                  showLabelMetadata={false}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </PlainTextsProvider>
  );
}
