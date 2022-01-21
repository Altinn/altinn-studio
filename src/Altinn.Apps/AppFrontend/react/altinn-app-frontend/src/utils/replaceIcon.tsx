import React from 'react';
import { HelpTextContainer } from 'src/features/form/components/HelpTextContainer';

interface IInsertHelpIconInNested {
  element: any;
  language: any;
  id: string;
  text?: string;
  hasPattern: boolean;
}

export function insertHelpIconInNested({
  element,
  language,
  id,
  text,
  hasPattern
}: IInsertHelpIconInNested) {
  if (text && hasPattern) {

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
            hasPattern
          });
        }
      } else {    

        arr[j] = replaceHelpWithIcon({
          element: arr[j],
          language,
          id,
          text,
          hasPattern
        });
      }
    }
  } else if(text && !hasPattern) {
      element = replaceHelpWithIcon({
        element: element,
        language,
        id,
        text,
        hasPattern
      });
  }
}

interface IReplaceHelpWithIcon {
  element: string;
  language: any;
  id: string;
  text?: string;
  hasPattern: boolean;
}

export function replaceHelpWithIcon({
  element,
  language,
  id,
  text,
  hasPattern
}: IReplaceHelpWithIcon) {
  if (text) {
    const replacePattern = "{help}";

    if (typeof element === 'string') {
      const iconPos = element.indexOf(replacePattern);

      if(iconPos == -1) {
        return element;
      } else {
        return (
          <>
            {element.substring(0, iconPos)}
            <HelpTextContainer language={language} id={id} helpText={text} />
            {element.substring(iconPos + replacePattern.length)}
          </>
        );
      }
    }


  }

  return element;
}


export function checkIfIcon(
  text: string
) {
  const replacePattern = "{help}";

  const iconPos = text.indexOf(replacePattern);

  if(iconPos != -1) {
    return true;
  } else {
    return false;
  }
  
}
