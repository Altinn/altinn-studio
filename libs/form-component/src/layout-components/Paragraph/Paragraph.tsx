import { type ReactNode } from 'react';

// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { HelpText } from '../../app-components/HelpText/HelpText';
// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { ParagraphText } from '../../app-components/ParagraphText/ParagraphText';
// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { useTranslation } from '../../LanguageTranslatorProvider';
import classes from './Paragraph.module.css';

export interface ParagraphProps {
  id?: string;
  title?: ReactNode;
  titleText?: string;
  help?: ReactNode;
}

export function Paragraph({ id, title, titleText, help }: ParagraphProps) {
  const { translate } = useTranslation();

  return (
    <div className={classes.paragraphWrapper}>
      <div id={id} data-testid={`paragraph-component-${id}`}>
        <ParagraphText>{title}</ParagraphText>
      </div>
      {help && (
        <HelpText
          id={id ? `${id}-helptext` : undefined}
          titlePrefix={titleText ? translate('helptext.button_title_prefix') : undefined}
          title={titleText ? titleText : translate('helptext.button_title')}
          className={classes.helpTextContainer}
        >
          {help}
        </HelpText>
      )}
    </div>
  );
}
