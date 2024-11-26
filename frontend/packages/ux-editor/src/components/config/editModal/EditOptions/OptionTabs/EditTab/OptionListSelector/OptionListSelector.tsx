import React from 'react';
import { ErrorMessage } from '@digdir/designsystemet-react';
import type { IGenericEditComponent } from '../../../../../componentConfig';
import type { SelectionComponentType } from '../../../../../../../types/FormComponent';
import { useOptionListIdsQuery } from '../../../../../../../hooks/queries/useOptionListIdsQuery';
import { useTranslation } from 'react-i18next';
import { StudioDropdownMenu, StudioSpinner } from '@studio/components';
import { BookIcon } from '@studio/icons';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import classes from './OptionListSelector.module.css';

type OptionListSelectorProps<T extends SelectionComponentType> = {
  setChosenOption: (value: boolean) => void;
} & Pick<IGenericEditComponent<T>, 'component' | 'handleComponentChange'>;

export function OptionListSelector<T extends SelectionComponentType>({
  setChosenOption,
  component,
  handleComponentChange,
}: OptionListSelectorProps<T>): React.ReactNode {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionListIds, status, error } = useOptionListIdsQuery(org, app);

  const handleOptionsIdChange = (optionsId: string) => {
    if (component.options) {
      delete component.options;
    }

    handleComponentChange({
      ...component,
      optionsId,
    });

    setChosenOption(true);
  };

  switch (status) {
    case 'pending':
      return (
        <StudioSpinner
          showSpinnerTitle={false}
          spinnerTitle={t('ux_editor.modal_properties_loading')}
        />
      );
    case 'error':
      return (
        <ErrorMessage>
          {error instanceof Error ? error.message : t('ux_editor.modal_properties_error_message')}
        </ErrorMessage>
      );
    case 'success':
      return (
        <OptionListSelectorWithData
          optionListIds={optionListIds}
          handleOptionsIdChange={handleOptionsIdChange}
        />
      );
  }
}

type OptionListSelectorWithDataProps = {
  optionListIds: string[];
  handleOptionsIdChange: (optionsId: string) => void;
};

function OptionListSelectorWithData({
  optionListIds,
  handleOptionsIdChange,
}: OptionListSelectorWithDataProps): React.ReactNode {
  const { t } = useTranslation();

  if (!optionListIds.length) return null;
  return (
    <StudioDropdownMenu
      size='small'
      anchorButtonProps={{
        className: classes.modalTrigger,

        variant: 'secondary',
        children: t('ux_editor.modal_properties_code_list'),
      }}
    >
      {optionListIds.map((optionListId: string) => (
        <StudioDropdownMenu.Item
          key={optionListId}
          icon={<BookIcon />}
          onClick={() => handleOptionsIdChange(optionListId)}
        >
          {optionListId}
        </StudioDropdownMenu.Item>
      ))}
    </StudioDropdownMenu>
  );
}
