import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioButton,
  StudioSelect,
  StudioTextfield,
  StudioToggleGroup,
} from '@designer/components';
import { PlusIcon, TrashIcon } from '@designer/icons';
import { useUpdateOptionListMutation } from 'app-shared/hooks/mutations/useUpdateOptionListMutation';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import type { LayoutComponent } from '../../types';
import {
  findCodeList,
  getCodeListIds,
  getInlineOptions,
  getNextOptionValue,
  getOptionSource,
  hasCodeList,
  YES_NO_CODE_LIST_ID,
  yesNoOptions,
} from '../../utils/optionUtils';
import type { InlineOption, OptionSource } from '../../utils/optionUtils';
import { setProperty } from '../../utils/layoutUtils';
import { usePageEditing } from '../PageEditing/PageEditingContext';
import classes from './SettingsPanel.module.css';

export type OptionsSettingProps = {
  component: LayoutComponent;
};

/** The options of a question: written for this question, or taken from a code list. */
export function OptionsSetting({ component }: OptionsSettingProps): ReactElement {
  const { t } = useTranslation();
  const { org, app, codeLists, texts } = useAppBuilder();
  const { pageName, updateComponent, saveTexts } = usePageEditing();
  const { mutate: saveCodeList } = useUpdateOptionListMutation(org, app);
  const source = getOptionSource(component);
  const options = getInlineOptions(component);

  const chooseCodeList = (codeListId: string): void => {
    if (codeListId === YES_NO_CODE_LIST_ID && !hasCodeList(codeLists, codeListId)) {
      saveCodeList({ optionListId: codeListId, optionList: yesNoOptions });
    }
    updateComponent(component.id, (current) =>
      setProperty(setProperty(current, 'options', undefined), 'optionsId', codeListId),
    );
  };

  const changeSource = (newSource: OptionSource): void => {
    if (newSource === 'codeList') {
      chooseCodeList(YES_NO_CODE_LIST_ID);
      return;
    }
    const firstKey = `${pageName}.${component.id}.option1`;
    saveTexts({ [firstKey]: t('app_builder.default_text.option', { number: 1 }) });
    updateComponent(component.id, (current) =>
      setProperty(setProperty(current, 'optionsId', undefined), 'options', [
        { value: '1', label: firstKey },
      ]),
    );
  };

  const setOptions = (newOptions: InlineOption[]): void =>
    updateComponent(component.id, (current) => setProperty(current, 'options', newOptions));

  const addOption = (): void => {
    const value = getNextOptionValue(options);
    const labelKey = `${pageName}.${component.id}.option${value}`;
    saveTexts({ [labelKey]: t('app_builder.default_text.option', { number: options.length + 1 }) });
    setOptions([...options, { value, label: labelKey }]);
  };

  const codeList = source === 'codeList' ? findCodeList(codeLists, component.optionsId) : [];

  return (
    <fieldset className={classes.fieldset}>
      <legend className={classes.legend}>{t('app_builder.settings.options')}</legend>
      <StudioToggleGroup
        data-size='sm'
        value={source}
        onChange={(value) => changeSource(value as OptionSource)}
      >
        <StudioToggleGroup.Item value='inline'>
          {t('app_builder.settings.options.inline')}
        </StudioToggleGroup.Item>
        <StudioToggleGroup.Item value='codeList'>
          {t('app_builder.settings.options.code_list')}
        </StudioToggleGroup.Item>
      </StudioToggleGroup>
      {source === 'inline' ? (
        <>
          {options.map((option, index) => {
            const label = texts[option.label] ?? option.label;
            return (
              <div key={String(option.value)} className={classes.optionRow}>
                <StudioTextfield
                  key={label}
                  aria-label={t('app_builder.settings.option_label', { number: index + 1 })}
                  defaultValue={label}
                  onBlur={(event) => {
                    if (event.target.value !== label)
                      saveTexts({ [option.label]: event.target.value });
                  }}
                />
                <StudioButton
                  variant='tertiary'
                  data-size='sm'
                  icon={<TrashIcon />}
                  title={t('app_builder.settings.delete_option', { option: label })}
                  aria-label={t('app_builder.settings.delete_option', { option: label })}
                  onClick={() => setOptions(options.filter(({ value }) => value !== option.value))}
                />
              </div>
            );
          })}
          <div>
            <StudioButton variant='tertiary' data-size='sm' icon={<PlusIcon />} onClick={addOption}>
              {t('app_builder.add_option')}
            </StudioButton>
          </div>
        </>
      ) : (
        <StudioSelect
          label={t('app_builder.settings.code_list')}
          description={t('app_builder.settings.code_list_contains', {
            options: codeList.map(({ label }) => texts[label] ?? label).join(', '),
          })}
          value={component.optionsId}
          onChange={(event) => chooseCodeList(event.target.value)}
        >
          {getCodeListIds(codeLists).map((id) => (
            <StudioSelect.Option key={id} value={id}>
              {id === YES_NO_CODE_LIST_ID ? t('app_builder.settings.code_list.yes_no') : id}
            </StudioSelect.Option>
          ))}
        </StudioSelect>
      )}
    </fieldset>
  );
}
