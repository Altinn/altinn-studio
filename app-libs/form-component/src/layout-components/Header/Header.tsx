import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { HelpTextContainer } from '@app/form-component/layout-components/common/HelpTextContainer';
import { Heading as DsHeading } from '@digdir/designsystemet-react';
import type { IGridStyling } from '@app/form-component/app-components/Flex';

import classes from './Header.module.css';

export type HeaderSize = 'L' | 'M' | 'S' | 'h2' | 'h3' | 'h4';

type DsHeadingProps = Pick<Parameters<typeof DsHeading>[0], 'level' | 'data-size'>;

function getHeaderProps(size?: HeaderSize): DsHeadingProps {
  switch (size) {
    case 'L':
    case 'h2': {
      return { level: 2, 'data-size': 'md' };
    }
    case 'M':
    case 'h3': {
      return { level: 3, 'data-size': 'sm' };
    }
    case 'S':
    case 'h4':
    default: {
      return { level: 4, 'data-size': 'xs' };
    }
  }
}

export interface HeaderProps {
  /** The indexed component ID; drives the heading's DOM id and the form-content wrapper. */
  componentId: string;
  /** Text resource key for the heading text. */
  title?: string;
  /** Text resource key for the help tooltip. */
  help?: string;
  /** Heading size; controls the heading level (h2/h3/h4) and its visual size. */
  size?: HeaderSize;
  /** Grid sizing for the inner content. */
  innerGrid?: IGridStyling;
}

export function Header({ componentId, title, help, size, innerGrid }: HeaderProps) {
  const { lang, langAsString } = useTranslation();

  return (
    <ComponentStructure componentId={componentId} innerGrid={innerGrid}>
      <div className={classes.headerWrapper}>
        <DsHeading id={componentId} {...getHeaderProps(size)}>
          {lang(title)}
        </DsHeading>
        {help && (
          <HelpTextContainer id={componentId} title={langAsString(title)} helpText={lang(help)} />
        )}
      </div>
    </ComponentStructure>
  );
}
