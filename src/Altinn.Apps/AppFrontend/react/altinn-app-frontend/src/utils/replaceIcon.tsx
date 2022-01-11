import React from 'react';
import { HelpTextContainer } from 'src/features/form/components/HelpTextContainer';

interface IInsertHelpIconInNested {
  element: any;
  language: any;
  id: string;
  text?: string;
}

export function insertHelpIconInNested({
  element,
  language,
  id,
  text,
}: IInsertHelpIconInNested) {
  if (text) {
    for (var j = 0; j < element.length; j++) {
      if (element[j]["props"]) {
        if (element[j]["props"]["children"]) {
          insertHelpIconInNested({
            element: element[j]["props"]["children"],
            language,
            id,
            text,
          });
        }
      } else {
        element[j] = replaceHelpWithIcon({
          element: element[j],
          language,
          id,
          text,
        });
      }
    }
  }
}

interface IReplaceHelpWithIcon {
  element: string;
  language: any;
  id: string;
  text?: string;
}

export function replaceHelpWithIcon({
  element,
  language,
  id,
  text,
}: IReplaceHelpWithIcon) {
  if (text) {
    const replacePattern = "{help}";

    // Backwards compat, add help text to end of string if its not present inline in the text
    if (!element.includes(replacePattern)) {
      element += ` ${replacePattern}`;
    }
    const iconPos = element.indexOf(replacePattern);

    return (
      <>
        {element.substring(0, iconPos)}
        <HelpTextContainer language={language} id={id} helpText={text} />
        {element.substring(iconPos + replacePattern.length)}
      </>
    );
  }

  return element;
}
