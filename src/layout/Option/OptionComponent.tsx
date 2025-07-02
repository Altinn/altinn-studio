import React from 'react';

import cn from 'classnames';

import { HelpText } from 'src/app-components/HelpText/HelpText';
import { getLabelId } from 'src/components/label/Label';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/Option/Option.module.css';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export const OptionComponent = ({ node }: PropsFromGenericComponent<'Option'>) => {
  const item = useItemWhenType(node.baseId, 'Option');

  if (!item.textResourceBindings?.title) {
    return (
      <Text
        node={node}
        usingLabel={false}
      />
    );
  }

  return (
    <ComponentStructureWrapper
      node={node}
      label={{
        baseComponentId: node.baseId,
        renderLabelAs: 'span',
        className: cn(
          classes.label,
          classes.optionComponent,
          item.direction === 'vertical' ? classes.vertical : classes.horizontal,
        ),
      }}
    >
      <Text
        node={node}
        usingLabel={true}
      />
    </ComponentStructureWrapper>
  );
};

interface TextProps {
  node: LayoutNode<'Option'>;
  usingLabel: boolean;
}

function Text({ node, usingLabel }: TextProps) {
  const { textResourceBindings, icon, value } = useItemWhenType(node.baseId, 'Option');
  const { options, isFetching } = useGetOptions(node.baseId, 'single');
  const { langAsString } = useLanguage();
  const selectedOption = options.find((option) => option.value === value);
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
        {...(usingLabel ? { 'aria-labelledby': getLabelId(node.id) } : {})}
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
