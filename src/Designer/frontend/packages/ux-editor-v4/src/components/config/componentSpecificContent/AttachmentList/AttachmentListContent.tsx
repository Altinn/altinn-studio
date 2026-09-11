import { StudioCheckbox, StudioSuggestion, type StudioSuggestionItem } from '@studio/components';
import { useTranslation } from 'react-i18next';

type IAttachmentListContent = {
  currentAvailableAttachments: string[];
  selectedDataTypes: string[];
  onChange: (selectedDataTypes: string[]) => void;
};

export const AttachmentListContent = ({
  currentAvailableAttachments,
  selectedDataTypes,
  onChange,
}: IAttachmentListContent) => {
  const { t } = useTranslation();
  const checkboxInIndeterminateState =
    selectedDataTypes.length > 0 && selectedDataTypes.length < currentAvailableAttachments.length;

  const handleSelectedChange = (items: StudioSuggestionItem[]): void =>
    onChange(items.map((item) => item.value));

  const setSelectAllCheckboxRef = (checkbox: HTMLInputElement | null): void => {
    if (checkbox) {
      checkbox.indeterminate = checkboxInIndeterminateState;
    }
  };

  return (
    <>
      <StudioCheckbox
        ref={setSelectAllCheckboxRef}
        data-size='sm'
        checked={selectedDataTypes.length === currentAvailableAttachments.length}
        aria-checked={checkboxInIndeterminateState ? 'mixed' : undefined}
        value={t('ux_editor.component_properties.select_all_attachments')}
        label={t('ux_editor.component_properties.select_all_attachments')}
        onChange={(e) => onChange(e.target.checked ? currentAvailableAttachments : [])}
      />
      <StudioSuggestion
        multiple
        label={t('ux_editor.component_properties.select_attachments')}
        emptyText={t('general.no_options')}
        selected={selectedDataTypes}
        onSelectedChange={handleSelectedChange}
      >
        {currentAvailableAttachments?.map((attachment) => (
          <StudioSuggestion.Option key={attachment} value={attachment} label={attachment}>
            {attachment}
          </StudioSuggestion.Option>
        ))}
      </StudioSuggestion>
    </>
  );
};
