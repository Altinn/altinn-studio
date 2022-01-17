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

    let arr;
    
    if(!element.length) {
      arr = element["props"]["children"];
    } else {
      arr = element;
    }

    for (let j = 0; j < arr.length; j++) {

      if (arr[j]["props"]) {
        if (arr[j]["props"]["children"]) {
          insertHelpIconInNested({
            element: arr[j]["props"]["children"],
            language,
            id,
            text,
          });
        }
      } else {    
        arr[j] = replaceHelpWithIcon({
          element: arr[j],
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
