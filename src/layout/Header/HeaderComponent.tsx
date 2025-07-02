import React from 'react';

import { Heading } from '@digdir/designsystemet-react';

import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export type IHeaderProps = PropsFromGenericComponent<'Header'>;

type HeadingProps = Pick<Parameters<typeof Heading>[0], 'level' | 'data-size'>;

function getHeaderProps(size?: string): HeadingProps {
  switch (size) {
    case 'L':
    case 'h2': {
      return {
        level: 2,
        'data-size': 'md',
      };
    }
    case 'M':
    case 'h3': {
      return {
        level: 3,
        'data-size': 'sm',
      };
    }
    case 'S':
    case 'h4':
    default: {
      return {
        level: 4,
        'data-size': 'xs',
      };
    }
  }
}

export const HeaderComponent = ({ node }: IHeaderProps) => {
  const { id, size, textResourceBindings } = useItemWhenType(node.baseId, 'Header');
  const { langAsString } = useLanguage();
  return (
    <ComponentStructureWrapper
      node={node}
      style={{ display: 'flex' }}
    >
      <Heading
        id={id}
        {...getHeaderProps(size)}
      >
        <Lang id={textResourceBindings?.title} />
      </Heading>
      {textResourceBindings?.help && (
        <HelpTextContainer
          id={id}
          helpText={<Lang id={textResourceBindings.help} />}
          title={langAsString(textResourceBindings?.title)}
        />
      )}
    </ComponentStructureWrapper>
  );
};
