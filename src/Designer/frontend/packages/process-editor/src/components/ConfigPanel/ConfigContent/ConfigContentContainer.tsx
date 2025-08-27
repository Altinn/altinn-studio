import React from 'react';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { getConfigTitleHelpTextKey, getConfigTitleKey } from '../../../utils/configPanelUtils';
import { useTranslation } from 'react-i18next';
import { StudioSectionHeader } from '@studio/components-legacy';
import { ConfigIcon } from './ConfigIcon';

type ConfigContentContainerProps = {
  children: React.ReactNode;
  className?: string;
};

export const ConfigContentContainer = ({
  className,
  children,
}: ConfigContentContainerProps): React.ReactElement => {
  const { bpmnDetails } = useBpmnContext();
  const { t } = useTranslation();
  const configHeaderTexts: Record<'title' | 'helpText', string> = {
    title: bpmnDetails?.taskType && t(getConfigTitleKey(bpmnDetails.taskType)),
    helpText: bpmnDetails?.taskType && t(getConfigTitleHelpTextKey(bpmnDetails.taskType)),
  };

  return (
    <>
      <StudioSectionHeader
        className={className}
        icon={<ConfigIcon taskType={bpmnDetails.taskType} />}
        heading={{
          text: configHeaderTexts.title,
          level: 2,
        }}
        helpText={{
          text: configHeaderTexts.helpText,
          title: t('process_editor.configuration_panel_header_help_text_title'),
        }}
      />
      {children}
    </>
  );
};
