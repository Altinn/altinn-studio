import type { ReactNode } from 'react';

import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { Description } from '@app/form-component/layout-components/common/Description';
import { Heading } from '@digdir/designsystemet-react';

import classes from './Lommebok.module.css';

export interface LommebokProps {
  componentId: string;
  title?: string;
  description?: string;
  children?: ReactNode;
}

/**
 * Shell for the Lommebok (digital wallet) component: a heading, an optional description, and the
 * list of requested/issuable documents (passed as children by the runtime wrapper).
 */
export function Lommebok({ componentId, title, description, children }: LommebokProps) {
  const { lang } = useTranslation();

  return (
    <div id={componentId} className={classes.container}>
      <Heading level={2} data-size='sm'>
        {lang(title)}
      </Heading>
      {description && <Description componentId={componentId} description={lang(description)} />}
      {children}
    </div>
  );
}
