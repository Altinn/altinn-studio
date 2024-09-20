import React, { type ReactElement, type ChangeEvent } from 'react';
import classes from './PreviewControlHeader.module.css';
import { useTranslation } from 'react-i18next';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { StudioNativeSelect } from '@studio/components';
import { ToggleGroup } from '@digdir/designsystemet-react';

export type PreviewControlHeaderProps = {
  viewSize: 'desktop' | 'mobile';
  setViewSize: (value: any) => void;
  selectedLayoutSet: string | null;
  handleChangeLayoutSet: (value: string) => void;
};

export const PreviewControlHeader = ({
  viewSize,
  setViewSize,
  selectedLayoutSet,
  handleChangeLayoutSet,
}: PreviewControlHeaderProps): ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  const handleLayoutSetChange = (event: ChangeEvent<HTMLSelectElement>) => {
    handleChangeLayoutSet(event.target.value);
  };

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
          <StudioNativeSelect onChange={handleLayoutSetChange} value={selectedLayoutSet}>
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
