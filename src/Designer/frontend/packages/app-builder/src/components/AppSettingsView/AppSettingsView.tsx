import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioHeading, StudioRadio, StudioRadioGroup, StudioSpinner } from '@designer/components';
import { useAppMetadataQuery } from 'app-shared/hooks/queries/useAppMetadataQuery';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import { useUpdateAppMetadataMutation } from '../../hooks/useUpdateAppMetadataMutation';
import { getSubmitters, submitterChoices, toPartyTypesAllowed } from '../../utils/submitterUtils';
import type { Submitters } from '../../utils/submitterUtils';
import classes from './AppSettingsView.module.css';

/** Settings for the whole app that a basic app needs: who can submit it. */
export function AppSettingsView(): ReactElement {
  const { t } = useTranslation();
  const { org, app } = useAppBuilder();
  const { data: metadata, isPending } = useAppMetadataQuery(org, app);
  const { mutate: updateMetadata } = useUpdateAppMetadataMutation(org, app);

  if (isPending || !metadata)
    return <StudioSpinner aria-hidden spinnerTitle={t('general.loading')} />;

  const current = getSubmitters(metadata.partyTypesAllowed);
  const handleChange = (submitters: Submitters): void =>
    updateMetadata({ ...metadata, partyTypesAllowed: toPartyTypesAllowed(submitters) });

  return (
    <div className={classes.appSettingsView}>
      <StudioHeading level={2} data-size='sm'>
        {t('app_builder.settings_view.title')}
      </StudioHeading>
      <StudioRadioGroup
        legend={t('app_builder.submitters.legend')}
        description={t('app_builder.submitters.description')}
      >
        {submitterChoices.map((submitters) => (
          <StudioRadio
            key={submitters}
            name='submitters'
            value={submitters}
            label={t(`app_builder.submitters.${submitters}`)}
            description={t(`app_builder.submitters.${submitters}.description`)}
            checked={current === submitters}
            onChange={() => handleChange(submitters)}
          />
        ))}
      </StudioRadioGroup>
    </div>
  );
}
