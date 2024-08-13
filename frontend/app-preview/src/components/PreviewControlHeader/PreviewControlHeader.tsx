import React from 'react';
import classes from './PreviewControlHeader.module.css';
import { useTranslation } from 'react-i18next';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { StudioNativeSelect } from '@studio/components';
import { ToggleGroup } from '@digdir/designsystemet-react';

export interface PreviewControlHeaderProps {
  viewSize: 'desktop' | 'mobile';
  setViewSize: (value: any) => void;
  selectedLayoutSet: string | null;
  handleChangeLayoutSet: (value: any) => void;
}

// TODO - Refactor this. Issue: #TODO, url: TODO
export const PreviewControlHeader = ({
  viewSize,
  setViewSize,
  selectedLayoutSet,
  handleChangeLayoutSet,
}: PreviewControlHeaderProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  return (
    <div className={classes.wrapper}>
      <div className={classes.viewSizeButtons}>
        <ToggleGroup
          onChange={setViewSize}
          value={viewSize === 'desktop' ? 'desktop' : 'mobile'}
          size='sm'
        >
          <ToggleGroup.Item value='desktop'>{t('preview.view_size_desktop')}</ToggleGroup.Item>
          <ToggleGroup.Item value='mobile'>{t('preview.view_size_mobile')}</ToggleGroup.Item>
        </ToggleGroup>
      </div>
      {layoutSets && (
        <div className={classes.layoutSetSelector}>
          <StudioNativeSelect
            onChange={(layoutSet) => handleChangeLayoutSet(layoutSet)}
            value={selectedLayoutSet}
          >
            {layoutSets.sets.map((layoutSet) => (
              <option key={layoutSet.id} value={layoutSet.id}>
                {layoutSet.id}
              </option>
            ))}
          </StudioNativeSelect>
        </div>
      )}
    </div>
  );
};
