import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioAlert,
  StudioDetails,
  StudioFormGroup,
  StudioList,
  StudioParagraph,
  StudioTag,
} from '@studio/components';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
import {
  EnvBooleanConfigField,
  EnvDataTypeListConfigField,
  EnvIntegerConfigField,
  EnvTextConfigField,
  getEnvironmentScopeTextKey,
} from '../../EnvironmentConfig';
import type { EFormidlingCoverageGap, RequiredEFormidlingProperty } from './eFormidlingCoverage';
import { getEFormidlingCoverageGaps, getUniversalCoverageGap } from './eFormidlingCoverage';
import type { EFormidlingProperty } from './useEFormidlingConfig';
import { useEFormidlingConfig } from './useEFormidlingConfig';
import classes from '../ConfigServiceTask.module.css';

const fieldLabelKeys: Record<EFormidlingProperty, string> = {
  disabled: 'process_editor.configuration_panel.eformidling.disabled_label',
  receiver: 'process_editor.configuration_panel.eformidling.receiver_label',
  process: 'process_editor.configuration_panel.eformidling.process_label',
  standard: 'process_editor.configuration_panel.eformidling.standard_label',
  type: 'process_editor.configuration_panel.eformidling.type_label',
  typeVersion: 'process_editor.configuration_panel.eformidling.type_version_label',
  securityLevel: 'process_editor.configuration_panel.eformidling.security_level_label',
  dpfShipmentType: 'process_editor.configuration_panel.eformidling.dpf_shipment_type_label',
  dataTypes: 'process_editor.configuration_panel.eformidling.data_types_label',
};

/** The required eFormidling fields stand open; only the optional ones fold away. */
export const ConfigEFormidlingServiceTask = (): ReactElement => {
  const { t } = useTranslation();
  const { availableDataTypeIds } = useBpmnApiContext();
  const config = useEFormidlingConfig();

  const coverageGaps = getEFormidlingCoverageGaps({
    process: config.process.entries,
    standard: config.standard.entries,
    type: config.type.entries,
    typeVersion: config.typeVersion.entries,
    securityLevel: config.securityLevel.entries,
  });

  const configuredOptionalFieldCount = [
    config.receiver,
    config.dpfShipmentType,
    config.dataTypes,
  ].filter(({ entries }) => entries.length > 0).length;

  return (
    <StudioList.Unordered className={classes.taskConfigList}>
      {coverageGaps.length > 0 && (
        <StudioList.Item>
          <MissingRequiredConfigAlert gaps={coverageGaps} />
        </StudioList.Item>
      )}

      <StudioList.Item>
        <StudioFormGroup
          className={classes.group}
          description={t('process_editor.configuration_panel.eformidling.sending_description')}
          legend={t('process_editor.configuration_panel.eformidling.sending_legend')}
          tagText={t('general.optional')}
        >
          {/* The stored value is `disabled`, so `true` is the answer that turns sending off. */}
          <EnvBooleanConfigField
            {...config.disabled}
            falseLabel={t('process_editor.configuration_panel.eformidling.sending_on')}
            label={t(fieldLabelKeys.disabled)}
            trueLabel={t('process_editor.configuration_panel.eformidling.sending_off')}
          />
        </StudioFormGroup>
      </StudioList.Item>

      <StudioList.Item>
        <StudioFormGroup
          className={classes.group}
          description={t('process_editor.configuration_panel.eformidling.shipment_description')}
          legend={t('process_editor.configuration_panel.eformidling.shipment_legend')}
          required
          tagText={t('general.required')}
        >
          <EnvTextConfigField {...config.process} label={t(fieldLabelKeys.process)} />
          <EnvTextConfigField {...config.standard} label={t(fieldLabelKeys.standard)} />
          <EnvTextConfigField {...config.type} label={t(fieldLabelKeys.type)} />
          <EnvTextConfigField {...config.typeVersion} label={t(fieldLabelKeys.typeVersion)} />
          <EnvIntegerConfigField
            {...config.securityLevel}
            description={t(
              'process_editor.configuration_panel.eformidling.security_level_description',
            )}
            label={t(fieldLabelKeys.securityLevel)}
          />
        </StudioFormGroup>
      </StudioList.Item>

      <StudioList.Item>
        <StudioDetails>
          <StudioDetails.Summary>
            <span>{t('process_editor.configuration_panel.eformidling.optional_legend')}</span>
            {configuredOptionalFieldCount > 0 && (
              <StudioTag data-color='info' data-size='sm'>
                {t('process_editor.configuration_panel.eformidling.optional_filled_count', {
                  fieldCount: configuredOptionalFieldCount,
                })}
              </StudioTag>
            )}
          </StudioDetails.Summary>
          <StudioDetails.Content className={classes.group}>
            <EnvTextConfigField
              {...config.receiver}
              description={t('process_editor.configuration_panel.eformidling.receiver_description')}
              label={t(fieldLabelKeys.receiver)}
            />
            <EnvTextConfigField
              {...config.dpfShipmentType}
              description={t(
                'process_editor.configuration_panel.eformidling.dpf_shipment_type_description',
              )}
              label={t(fieldLabelKeys.dpfShipmentType)}
            />
            <EnvDataTypeListConfigField
              {...config.dataTypes}
              dataTypeIds={availableDataTypeIds ?? []}
              description={t(
                'process_editor.configuration_panel.eformidling.data_types_description',
              )}
              label={t(fieldLabelKeys.dataTypes)}
            />
          </StudioDetails.Content>
        </StudioDetails>
      </StudioList.Item>
    </StudioList.Unordered>
  );
};

type MissingRequiredConfigAlertProps = {
  gaps: EFormidlingCoverageGap[];
};

const MissingRequiredConfigAlert = ({ gaps }: MissingRequiredConfigAlertProps): ReactElement => {
  const { t } = useTranslation();

  const fieldNames = (properties: RequiredEFormidlingProperty[]): string =>
    properties.map((property) => t(fieldLabelKeys[property])).join(', ');

  const universalGap = getUniversalCoverageGap(gaps);
  if (universalGap) {
    return (
      <StudioAlert data-color='warning'>
        <StudioParagraph data-size='sm'>
          {t('process_editor.configuration_panel.eformidling.missing_required_everywhere', {
            fields: fieldNames(universalGap),
          })}
        </StudioParagraph>
      </StudioAlert>
    );
  }

  return (
    <StudioAlert data-color='warning'>
      <StudioParagraph data-size='sm'>
        {t('process_editor.configuration_panel.eformidling.missing_required_alert')}
      </StudioParagraph>
      <StudioList.Unordered data-size='sm'>
        {gaps.map(({ environment, missingProperties }) => (
          <StudioList.Item key={environment}>
            {t('process_editor.configuration_panel.eformidling.missing_required_environment', {
              environment: t(getEnvironmentScopeTextKey(environment)),
              fields: fieldNames(missingProperties),
            })}
          </StudioList.Item>
        ))}
      </StudioList.Unordered>
    </StudioAlert>
  );
};
