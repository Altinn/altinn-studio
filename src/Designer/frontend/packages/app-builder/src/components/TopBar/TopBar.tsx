import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useIsMutating } from '@tanstack/react-query';
import { StudioButton, StudioLinkButton, StudioSelect } from '@designer/components';
import { PlayFillIcon } from '@designer/icons';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import classes from './TopBar.module.css';

export type TopBarProps = {
  org: string;
  app: string;
  layoutSets: LayoutSets;
  layoutSetName: string;
  onLayoutSetChange: (layoutSetName: string) => void;
  pageNames: string[];
  pageName?: string;
  onPageChange: (pageName: string) => void;
};

export function TopBar({
  org,
  app,
  layoutSets,
  layoutSetName,
  onLayoutSetChange,
  pageNames,
  pageName,
  onPageChange,
}: TopBarProps): ReactElement {
  const { t } = useTranslation();
  const isSaving = useIsMutating() > 0;
  const previewLink = `${new PackagesRouter({ org, app }).getPackageNavigationUrl('preview')}?layout=${pageName ?? ''}`;

  return (
    <div className={classes.topBar}>
      {layoutSets.length > 1 && (
        <StudioSelect
          label={t('app_builder.layout_set')}
          data-size='sm'
          value={layoutSetName}
          onChange={(event) => onLayoutSetChange(event.target.value)}
        >
          {layoutSets.map((layoutSet) => (
            <StudioSelect.Option key={layoutSet.id} value={layoutSet.id}>
              {layoutSet.id}
            </StudioSelect.Option>
          ))}
        </StudioSelect>
      )}
      <nav className={classes.pages} aria-label={t('app_builder.pages')}>
        {pageNames.map((name) => (
          <StudioButton
            key={name}
            variant={name === pageName ? 'secondary' : 'tertiary'}
            data-size='sm'
            aria-current={name === pageName ? 'page' : undefined}
            onClick={() => onPageChange(name)}
          >
            {name}
          </StudioButton>
        ))}
      </nav>
      <span className={classes.saveStatus} role='status'>
        {isSaving ? t('general.saving') : t('app_builder.saved')}
      </span>
      <StudioLinkButton
        href={previewLink}
        variant='secondary'
        data-size='sm'
        icon={<PlayFillIcon />}
      >
        {t('app_builder.test_app')}
      </StudioLinkButton>
    </div>
  );
}
