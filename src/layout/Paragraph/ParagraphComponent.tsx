import React from 'react';

import { Grid, Typography } from '@material-ui/core';

import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import { useLanguage } from 'src/hooks/useLanguage';
import { getPlainTextFromNode } from 'src/utils/stringHelper';
import type { PropsFromGenericComponent } from 'src/layout';

export type IParagraphProps = PropsFromGenericComponent<'Paragraph'>;

export function ParagraphComponent({ node }: IParagraphProps) {
  const { id, textResourceBindings } = node.item;
  const { lang } = useLanguage();
  const text = lang(textResourceBindings?.title);

  return (
    <Grid
      container={true}
      direction='row'
      alignItems='center'
      spacing={1}
    >
      <Grid item={true}>
        <Typography
          component={'div'}
          id={id}
          data-testid={`paragraph-component-${id}`}
        >
          {text}
        </Typography>
      </Grid>
      {textResourceBindings?.help && (
        <Grid item={true}>
          <HelpTextContainer
            helpText={lang(textResourceBindings.help)}
            title={getPlainTextFromNode(text)}
          />
        </Grid>
      )}
    </Grid>
  );
}
