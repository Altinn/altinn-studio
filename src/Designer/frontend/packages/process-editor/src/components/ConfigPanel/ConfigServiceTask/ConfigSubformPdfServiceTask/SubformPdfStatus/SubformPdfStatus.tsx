import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { StudioAlert, StudioButton, StudioParagraph } from '@studio/components';
import { PencilIcon } from '@studio/icons';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { SubformPdfIssue } from '../subformPdfComponents';
import classes from './SubformPdfStatus.module.css';

export type SubformPdfStatusProps = {
  issue: SubformPdfIssue | undefined;
  subformComponentId: string;
  pagesLayoutSetId: string | undefined;
  onFixDataType: (subformDataTypeId: string) => void;
  onCreateComponentCopy: () => void;
};

/** What stops the app from generating the pdf, or the way to the task's pages once nothing does. */
export const SubformPdfStatus = ({
  issue,
  subformComponentId,
  pagesLayoutSetId,
  onFixDataType,
  onCreateComponentCopy,
}: SubformPdfStatusProps): ReactElement | null => {
  const { t } = useTranslation();

  if (!issue) return pagesLayoutSetId ? <DesignTaskButton layoutSetId={pagesLayoutSetId} /> : null;

  switch (issue.kind) {
    case 'componentNotFound':
      return (
        <IssueAlert
          message={t('process_editor.configuration_panel_subform_pdf_component_not_found', {
            componentId: subformComponentId,
          })}
        />
      );
    case 'ambiguousComponent':
      return (
        <IssueAlert
          message={t('process_editor.configuration_panel_subform_pdf_component_ambiguous', {
            componentId: subformComponentId,
          })}
        />
      );
    case 'missingSubformDataType':
      return (
        <IssueAlert
          message={t('process_editor.configuration_panel_subform_pdf_subform_data_type_missing', {
            componentId: subformComponentId,
          })}
        />
      );
    case 'dataTypeMismatch':
      return (
        <IssueAlert
          message={t('process_editor.configuration_panel_subform_pdf_data_type_mismatch', {
            componentId: subformComponentId,
          })}
          actionText={t('process_editor.configuration_panel_subform_pdf_data_type_fix_button')}
          onAction={() => onFixDataType(issue.subformDataTypeId)}
        />
      );
    case 'missingPages':
      return (
        <IssueAlert
          message={t('process_editor.configuration_panel_subform_pdf_pages_missing', {
            componentId: subformComponentId,
          })}
          actionText={t('process_editor.configuration_panel_subform_pdf_pages_create_button')}
          onAction={onCreateComponentCopy}
        />
      );
    case 'missingComponentCopy':
      return (
        <IssueAlert
          message={t('process_editor.configuration_panel_subform_pdf_component_copy_missing', {
            componentId: subformComponentId,
          })}
          actionText={t(
            'process_editor.configuration_panel_subform_pdf_component_copy_create_button',
          )}
          onAction={onCreateComponentCopy}
        />
      );
  }
};

type IssueAlertProps = {
  message: string;
  actionText?: string;
  onAction?: () => void;
};

const IssueAlert = ({ message, actionText, onAction }: IssueAlertProps): ReactElement => (
  <StudioAlert data-color='warning'>
    <StudioParagraph data-size='sm'>{message}</StudioParagraph>
    {actionText && (
      <StudioButton className={classes.action} onClick={onAction}>
        {actionText}
      </StudioButton>
    )}
  </StudioAlert>
);

type DesignTaskButtonProps = {
  layoutSetId: string;
};

const DesignTaskButton = ({ layoutSetId }: DesignTaskButtonProps): ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { org, app } = useStudioEnvironmentParams();

  return (
    <div>
      <StudioButton
        onClick={() => navigate(`/${org}/${app}/ui-editor/layoutSet/${layoutSetId}`)}
        icon={<PencilIcon />}
      >
        {t('process_editor.configuration_panel_subform_pdf_design_task_button')}
      </StudioButton>
    </div>
  );
};
