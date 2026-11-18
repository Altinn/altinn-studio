import { useId, useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import { getAllComponents } from '../../utils/layoutUtils';
import { getComponentsByField } from '../../utils/bindingUtils';
import { getComponentText } from '../../utils/componentUtils';
import { getFieldNames } from '../../utils/dataModelUtils';
import classes from './BindingLine.module.css';

export type BindingSearchProps = {
  componentId: string;
  currentField?: string;
  onChoose: (field: string) => void;
  onCancel: () => void;
};

/**
 * Searches the fields of the data model, matching anywhere in the name. Each suggestion says which
 * other component already saves to the field, since two components on one field share the answer.
 */
export function BindingSearch({
  componentId,
  currentField,
  onChoose,
  onCancel,
}: BindingSearchProps): ReactElement {
  const { t } = useTranslation();
  const id = useId();
  const { dataModel, layouts, texts } = useAppBuilder();
  const [query, setQuery] = useState<string>('');
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const componentsByField = getComponentsByField(getAllComponents(layouts));
  const matches = getFieldNames(dataModel?.schema).filter((field) =>
    field.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const optionId = (index: number): string => `${id}-option-${index}`;

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, matches.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (matches[activeIndex]) onChoose(matches[activeIndex]);
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      onCancel();
    }
  };

  return (
    <div className={classes.search}>
      <input
        className='ds-input'
        role='combobox'
        aria-label={t('app_builder.binding.search')}
        aria-expanded
        aria-controls={`${id}-listbox`}
        aria-activedescendant={matches.length > 0 ? optionId(activeIndex) : undefined}
        aria-autocomplete='list'
        value={query}
        // The search opens because the user asked for it, so it takes focus.
        autoFocus
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
        }}
        onKeyDown={handleKeyDown}
        onBlur={onCancel}
      />
      <ul id={`${id}-listbox`} role='listbox' className={classes.listbox}>
        {matches.length === 0 && (
          <li className={classes.empty}>{t('app_builder.binding.no_match')}</li>
        )}
        {matches.map((field, index) => {
          const usedBy = (componentsByField.get(field) ?? []).find(
            ({ id: otherId }) => otherId !== componentId,
          );
          return (
            <li
              key={field}
              id={optionId(index)}
              role='option'
              aria-selected={index === activeIndex}
              className={cn(classes.option, { [classes.active]: index === activeIndex })}
              // Chosen on mouse down, before the input loses focus and closes the list.
              onMouseDown={(event) => {
                event.preventDefault();
                onChoose(field);
              }}
            >
              <span className={cn({ [classes.current]: field === currentField })}>{field}</span>
              {usedBy && (
                <span className={classes.usedBy}>
                  {t('app_builder.binding.used_by', {
                    componentName: getComponentText(usedBy, texts) ?? usedBy.id,
                  })}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
