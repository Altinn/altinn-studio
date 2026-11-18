import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioParagraph, StudioTextfield } from '@designer/components';
import { ArrowDownIcon, ArrowUpIcon } from '@designer/icons';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import { usePageActions } from '../../hooks/usePageActions';
import { getPageNumber, getPageTitle, getSubmitButtonTextKey } from '../../utils/pageUtils';
import { useCanvasState } from '../CanvasState/CanvasStateContext';
import { usePageEditing } from '../PageEditing/PageEditingContext';
import { DeletePageButton } from './DeletePageButton';
import { SettingsPanelFrame, SettingsSection } from './SettingsPanelFrame';
import { VisibilitySetting } from './VisibilitySetting';
import classes from './SettingsPanel.module.css';

export type PageSettingsPanelProps = {
  /** Called after the page is deleted, so another page can be shown. */
  onPageDeleted: () => void;
};

/** The settings of a content page: its name, place in the order, visibility and deletion. */
export function PageSettingsPanel({ onPageDeleted }: PageSettingsPanelProps): ReactElement {
  const { t } = useTranslation();
  const { texts, contentPageNames } = useAppBuilder();
  const { setOpenSettings } = useCanvasState();
  const { pageName, layout, saveLayout, saveTexts } = usePageEditing();
  const { movePage } = usePageActions();
  const title = getPageTitle(pageName, texts);
  const pageNumber = getPageNumber(pageName, contentPageNames);

  return (
    <SettingsPanelFrame
      kicker={t('app_builder.page.number', { number: pageNumber, count: contentPageNames.length })}
      title={title}
      onClose={() => setOpenSettings(undefined)}
      footer={
        // The app keeps at least one page to fill in.
        contentPageNames.length > 1 && <DeletePageButton onPageDeleted={onPageDeleted} />
      }
    >
      <SettingsSection title={t('app_builder.settings.content')}>
        <StudioTextfield
          key={title}
          label={t('app_builder.page.name')}
          description={t('app_builder.page.name.description')}
          defaultValue={title}
          onBlur={(event) => {
            const value = event.target.value.trim();
            if (value && value !== title) saveTexts({ [pageName]: value });
          }}
        />
        <div className={classes.chips}>
          {pageNumber > 1 && (
            <StudioButton
              variant='secondary'
              data-size='sm'
              icon={<ArrowUpIcon />}
              onClick={() => movePage(pageName, -1)}
            >
              {t('app_builder.page.move_up')}
            </StudioButton>
          )}
          {pageNumber < contentPageNames.length && (
            <StudioButton
              variant='secondary'
              data-size='sm'
              icon={<ArrowDownIcon />}
              onClick={() => movePage(pageName, 1)}
            >
              {t('app_builder.page.move_down')}
            </StudioButton>
          )}
        </div>
      </SettingsSection>
      <VisibilitySetting
        target='page'
        hidden={layout.data.hidden}
        onChange={(hidden) => saveLayout(setPageHidden(layout, hidden))}
      />
    </SettingsPanelFrame>
  );
}

function setPageHidden<T extends { data: Record<string, unknown> }>(layout: T, hidden: unknown): T {
  const { hidden: _previous, ...data } = layout.data;
  return { ...layout, data: hidden === undefined ? data : { ...data, hidden } };
}

/**
 * The settings of the summary page: what it does, the text on its submit button, and deletion, for an
 * app that submits from a page of its own.
 */
export function SummarySettingsPanel({ onPageDeleted }: PageSettingsPanelProps): ReactElement {
  const { t } = useTranslation();
  const { texts } = useAppBuilder();
  const { setOpenSettings } = useCanvasState();
  const { layout, saveTexts } = usePageEditing();
  const submitTextKey = getSubmitButtonTextKey(layout);
  const submitText = submitTextKey ? (texts[submitTextKey] ?? '') : '';

  return (
    <SettingsPanelFrame
      kicker={t('app_builder.summary.kicker')}
      title={t('app_builder.summary.title')}
      onClose={() => setOpenSettings(undefined)}
      footer={<DeletePageButton onPageDeleted={onPageDeleted} />}
    >
      <SettingsSection title={t('app_builder.settings.content')}>
        <StudioParagraph data-size='sm'>{t('app_builder.summary.explanation')}</StudioParagraph>
        {submitTextKey && (
          <StudioTextfield
            key={submitText}
            label={t('app_builder.summary.submit_text')}
            defaultValue={submitText}
            onBlur={(event) => {
              if (event.target.value !== submitText)
                saveTexts({ [submitTextKey]: event.target.value });
            }}
          />
        )}
      </SettingsSection>
    </SettingsPanelFrame>
  );
}
