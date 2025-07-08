import React from 'react';

import cn from 'classnames';

import { HelpText } from 'src/app-components/HelpText/HelpText';
import { getLabelId } from 'src/components/label/Label';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/Option/Option.module.css';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const OptionComponent = ({ baseComponentId }: PropsFromGenericComponent<'Option'>) => {
  const item = useItemWhenType(baseComponentId, 'Option');

  if (!item.textResourceBindings?.title) {
    return (
      <Text
        baseComponentId={baseComponentId}
        usingLabel={false}
      />
    );
  }

  return (
    <ComponentStructureWrapper
      baseComponentId={baseComponentId}
      label={{
        baseComponentId,
        renderLabelAs: 'span',
        className: cn(
          classes.label,
          classes.optionComponent,
          item.direction === 'vertical' ? classes.vertical : classes.horizontal,
        ),
      }}
    >
      <Text
        baseComponentId={baseComponentId}
        usingLabel={true}
      />
    </ComponentStructureWrapper>
  );
};

interface TextProps {
  baseComponentId: string;
  usingLabel: boolean;
}

function Text({ baseComponentId, usingLabel }: TextProps) {
  const { textResourceBindings, icon, value } = useItemWhenType(baseComponentId, 'Option');
  const { options, isFetching } = useGetOptions(baseComponentId, 'single');
  const { langAsString } = useLanguage();
  const selectedOption = options.find((option) => option.value === value);
  const indexedId = useIndexedId(baseComponentId);
  if (isFetching) {
    return null;
  }

  return (
    <>
      {icon && textResourceBindings?.title && (
        <img
          src={icon}
          className={classes.icon}
          alt={langAsString(textResourceBindings.title)}
        />
      )}
      <span
        {...(usingLabel ? { 'aria-labelledby': getLabelId(indexedId) } : {})}
        className={classes.optionLabelContainer}
      >
        <Lang id={selectedOption?.label} />
        {selectedOption?.helpText && (
          <HelpText title={langAsString(selectedOption.helpText)}>
            <Lang id={selectedOption.helpText} />
          </HelpText>
        )}
        {selectedOption?.description && (
          <span className={classes.optionDescription}>
            <Lang id={selectedOption?.description} />
          </span>
        )}
      </span>
    </>
  );
}
