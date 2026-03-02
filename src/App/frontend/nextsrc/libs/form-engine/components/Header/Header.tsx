import React from 'react';

import { Heading } from '@digdir/designsystemet-react';

import { HelpText } from 'src/app-components/HelpText/HelpText';
import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { asTranslationKey } from 'nextsrc/libs/form-engine/AppComponentsBridge';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';
import type { CompHeaderExternal } from 'src/layout/Header/config.generated';

const sizeToLevel: Record<string, 1 | 2 | 3 | 4 | 5 | 6> = {
  L: 2,
  M: 3,
  S: 4,
  h2: 2,
  h3: 3,
  h4: 4,
};

export const Header = ({ component }: ComponentProps) => {
  const props = component as CompHeaderExternal;
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const helpKey = typeof props.textResourceBindings?.help === 'string' ? props.textResourceBindings.help : undefined;
  const helpText = useTextResource(helpKey);
  const level = sizeToLevel[props.size] ?? 2;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Heading level={level}>{title}</Heading>
      {helpText && (
        <HelpText
          title={asTranslationKey(titleKey ?? 'helptext.button_title')}
        >
          {helpText}
        </HelpText>
      )}
    </div>
  );
};
