import { Heading } from '@digdir/designsystemet-react';

// this eslint-disables will be fixed once this PR is merged:
// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { HelpText } from '../../app-components';
// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { useTranslation } from '../../LanguageTranslatorProvider';
import classes from './Header.module.css';

export type HeaderSize = 'L' | 'M' | 'S' | 'h2' | 'h3' | 'h4';

type HeadingProps = Pick<Parameters<typeof Heading>[0], 'level' | 'data-size'>;

function getHeaderProps(size?: HeaderSize): HeadingProps {
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

export interface HeaderProps {
  id?: string;
  /** Text-resource key for the heading text. */
  title?: string;
  /** Text-resource key for the help text shown in a tooltip next to the heading. */
  help?: string;
  /** The size of the header, which also determines the heading level. */
  size?: HeaderSize;
}

export function Header({ id, title, help, size }: HeaderProps) {
  const { lang, translate, TranslateComponent } = useTranslation();

  const titleText = title ? translate(title) : '';

  return (
    <div className={classes.headerWrapper}>
      <Heading id={id} {...getHeaderProps(size)}>
        {lang(title)}
      </Heading>
      {help && (
        <HelpText
          id={id ? `${id}-helptext` : undefined}
          titlePrefix={titleText ? translate('helptext.button_title_prefix') : undefined}
          title={titleText ? titleText : translate('helptext.button_title')}
          className={classes.helpTextContainer}
        >
          <TranslateComponent tKey={help} />
        </HelpText>
      )}
    </div>
  );
}
