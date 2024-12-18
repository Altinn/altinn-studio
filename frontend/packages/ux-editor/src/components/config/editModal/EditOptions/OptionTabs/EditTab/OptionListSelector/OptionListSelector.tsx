import React from 'react';
import { ErrorMessage } from '@digdir/designsystemet-react';
import type { IGenericEditComponent } from '../../../../../componentConfig';
import type { SelectionComponentType } from '../../../../../../../types/FormComponent';
import { useOptionListIdsQuery } from '../../../../../../../hooks/queries/useOptionListIdsQuery';
import { useTranslation } from 'react-i18next';
import { StudioDropdownMenu, StudioSpinner } from '@studio/components';
import { BookIcon } from '@studio/icons';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { handleOptionsIdChange } from '../utils/utils';
import classes from './OptionListSelector.module.css';

type OptionListSelectorProps = Pick<
  IGenericEditComponent<SelectionComponentType>,
  'component' | 'handleComponentChange'
>;

export function OptionListSelector({
  component,
  handleComponentChange,
}: OptionListSelectorProps): React.ReactNode {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionListIds, status } = useOptionListIdsQuery(org, app);

  switch (status) {
    case 'pending':
      return (
        <StudioSpinner
          showSpinnerTitle={false}
          spinnerTitle={t('ux_editor.modal_properties_loading')}
        />
      );
    case 'error':
      return <ErrorMessage>{t('ux_editor.modal_properties_error_message')}</ErrorMessage>;
    case 'success':
      return (
        <OptionListSelectorWithData
          optionListIds={optionListIds}
          component={component}
          handleComponentChange={handleComponentChange}
        />
      );
  }
}

type OptionListSelectorWithDataProps = {
  optionListIds: string[];
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

function OptionListSelectorWithData({
  component,
  handleComponentChange,
  optionListIds,
}: OptionListSelectorWithDataProps): React.ReactNode {
  const { t } = useTranslation();

  const handleClick = (optionsId: string) => {
    handleOptionsIdChange({ component, handleComponentChange, optionsId });
  };

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
      {optionListIds.map((optionsId: string) => (
        <StudioDropdownMenu.Item
          key={optionsId}
          icon={<BookIcon />}
          onClick={() => handleClick(optionsId)}
        >
          {optionsId}
        </StudioDropdownMenu.Item>
      ))}
    </StudioDropdownMenu>
  );
}
