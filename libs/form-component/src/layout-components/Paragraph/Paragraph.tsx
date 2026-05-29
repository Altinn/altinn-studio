import classes from './Paragraph.module.css';

import { HelpText, ParagraphText } from 'src/app-components';
import { useTranslation } from 'src/LanguageTranslatorProvider';

export interface ParagraphProps {
  id?: string;
  title?: string;
  help?: string;
}

export function Paragraph({ id, title, help }: ParagraphProps) {
  const { lang, translate, TranslateComponent } = useTranslation();

  const titleText = title ? translate(title) : '';

  return (
    <div className={classes.paragraphWrapper}>
      <div id={id} data-testid={`paragraph-component-${id}`}>
        <ParagraphText>{lang(title)}</ParagraphText>
      </div>
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
