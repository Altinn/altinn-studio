import React, { useMemo } from 'react';
import { ErrorMessage } from '@digdir/designsystemet-react';
import classes from '../EditOptions.module.css';
import type { IGenericEditComponent } from '../../../componentConfig';
import { useComponentErrorMessage } from '../../../../../hooks';
import { addOptionToComponent, generateRandomOption } from '../../../../../utils/component';
import {
  StudioCodeListEditor,
  StudioModal,
  StudioParagraph,
  StudioProperty,
} from '@studio/components';
import type { SelectionComponentType } from '../../../../../types/FormComponent';
import { EditOption } from '../../EditOption';
import { ArrayUtils } from '@studio/pure-functions';
import type { Option } from 'app-shared/types/Option';
import { useTranslation } from 'react-i18next';
import { TableIcon } from '@studio/icons';

export function EditManualOptions<T extends SelectionComponentType>({
  component,
  handleComponentChange,
}: IGenericEditComponent<T>) {
  const { t } = useTranslation();

  const mappedOptionIds = useMemo(
    () => component.options?.map((_, index) => `option_${index}`),
    [component.options],
  );

  const errorMessage = useComponentErrorMessage(component);

  const handleOptionsChange = (options: Option[]) => {
    handleComponentChange({
      ...component,
      options,
    });
  };

  const handleOptionChange = (index: number) => (newOption: Option) => {
    const newOptions = ArrayUtils.replaceByIndex(component.options || [], index, newOption);
    return handleOptionsChange(newOptions);
  };

  const handleRemoveOption = (index: number) => {
    const options = [...(component.options || [])];
    options.splice(index, 1);
    handleOptionsChange(options);
  };

  const handleAddOption = () => {
    if (component.optionsId) {
      delete component.optionsId;
    }

    handleComponentChange(addOptionToComponent(component, generateRandomOption()));
  };

  const texts = {
    add: t('ux_editor.modal_new_option'),
    codeList: t('ux_editor.modal_add_options_codelist'),
    delete: t('general.delete'),
    deleteItem: (number) => t('ux_editor.modal_properties_code_list_delete_item', { number }),
    description: t('general.description'),
    emptyCodeList: t('ux_editor.modal_properties_code_list_empty'),
    helpText: t('ux_editor.options_text_help_text'),
    itemDescription: (number) =>
      t('ux_editor.modal_properties_code_list_item_description', { number }),
    itemHelpText: (number) => t('ux_editor.modal_properties_code_list_item_helpText', { number }),
    itemLabel: (number) => t('ux_editor.modal_properties_code_list_item_label', { number }),
    itemValue: (number) => t('ux_editor.modal_properties_code_list_item_value', { number }),
    label: t('ux_editor.options_text_label'),
    value: t('general.value'),
  };

  return (
    <>
      {component.options.length > 0 && (
        <StudioParagraph>{component.options.length} alternativer er definert.</StudioParagraph>
      )}
      <StudioModal.Root>
        <StudioModal.Trigger variant='secondary' icon={<TableIcon />}>
          Åpne redigeringsverktøy
        </StudioModal.Trigger>
        <StudioModal.Dialog
          className={classes.manualTabModal}
          closeButtonTitle={t('general.close')}
          heading={t('ux_editor.modal_add_options_codelist')}
        >
          <StudioCodeListEditor
            codeList={component.options ?? []}
            onChange={(codeList) => handleOptionsChange(codeList)}
            texts={texts}
          />
        </StudioModal.Dialog>
      </StudioModal.Root>
      {errorMessage && (
        <ErrorMessage className={classes.errorMessage} size='small'>
          {errorMessage}
        </ErrorMessage>
      )}
    </>
  );

  // return (
  //   <>
  //     <StudioProperty.Group>
  //       {component.options?.map((option, index) => {
  //         const removeItem = () => handleRemoveOption(index);
  //         const key = mappedOptionIds[index];
  //         const optionNumber = index + 1;
  //         const legend =
  //           component.type === 'RadioButtons'
  //             ? t('ux_editor.radios_option', { optionNumber })
  //             : t('ux_editor.checkboxes_option', { optionNumber });
  //         return (
  //           <EditOption
  //             key={key}
  //             legend={legend}
  //             onChange={handleOptionChange(index)}
  //             onDelete={removeItem}
  //             option={option}
  //           />
  //         );
  //       })}
  //       <StudioProperty.Button
  //         disabled={component.options?.some(({ label }) => !label)}
  //         onClick={handleAddOption}
  //         property={t('ux_editor.modal_new_option')}
  //       />
  //     </StudioProperty.Group>
  //
  //     {errorMessage && (
  //       <ErrorMessage className={classes.errorMessage} size='small'>
  //         {errorMessage}
  //       </ErrorMessage>
  //     )}
  //   </>
  // );
}
