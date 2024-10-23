import React from 'react';

import { Heading } from '@digdir/designsystemet-react';
import { Grid } from '@material-ui/core';

import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export type IHeaderProps = PropsFromGenericComponent<'Header'>;

type HeadingProps = {
  level: Parameters<typeof Heading>[0]['level'];
  size: Parameters<typeof Heading>[0]['size'];
};

function getHeaderProps(size?: string): HeadingProps {
  switch (size) {
    case 'L':
    case 'h2': {
      return {
        level: 2,
        size: 'medium',
      };
    }
    case 'M':
    case 'h3': {
      return {
        level: 3,
        size: 'small',
      };
    }
    case 'S':
    case 'h4':
    default: {
      return {
        level: 4,
        size: 'xsmall',
      };
    }
  }
}

export const HeaderComponent = ({ node }: IHeaderProps) => {
  const { id, size, textResourceBindings } = useNodeItem(node);
  const { langAsString } = useLanguage();
  return (
    <ComponentStructureWrapper node={node}>
      <Grid
        container={true}
        direction='row'
        alignItems='center'
      >
        <Grid item={true}>
          <Heading
            id={id}
            {...getHeaderProps(size)}
          >
            <Lang
              id={textResourceBindings?.title}
              node={node}
            />
          </Heading>
        </Grid>
        {textResourceBindings?.help && (
          <Grid item={true}>
            <HelpTextContainer
              helpText={
                <Lang
                  id={textResourceBindings.help}
                  node={node}
                />
              }
              title={langAsString(textResourceBindings?.title)}
            />
          </Grid>
        )}
      </Grid>
    </ComponentStructureWrapper>
  );
};
