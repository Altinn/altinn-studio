import { ParagraphText } from '../../app-components';
import { useTranslation } from '../../LanguageTranslatorProvider';
import { HelpTextContainer } from '../common/HelpTextContainer';
import classes from './Paragraph.module.css';

export interface ParagraphProps {
  id?: string;
  title?: string;
  help?: string;
}

export function Paragraph({ id, title, help }: ParagraphProps) {
  const { lang } = useTranslation();

  return (
    <div className={classes.paragraphWrapper}>
      <div id={id} data-testid={`paragraph-component-${id}`} className={classes.paragraphText}>
        <ParagraphText>{lang(title)}</ParagraphText>
      </div>
      {help && <HelpTextContainer id={id} title={title} helpText={lang(help)} />}
    </div>
  );
}
