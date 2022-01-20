import React from 'react';
import { HelpTextContainer } from 'src/features/form/components/HelpTextContainer';

interface IInsertHelpIconInNested {
  element: any;
  language: any;
  id: string;
  text?: string;
  hasPattern: boolean;
}
// let hasPattern = false;

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
          /* eslint-disable no-console */
          // console.log("kjører rekursiv");
          /* eslint-enable no-console */
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

    // Backwards compat, add help text to end of string if its not present inline in the text
    if (!hasPattern) {
      element += ` ${replacePattern}`;
    }
    const iconPos = element.indexOf(replacePattern);
    /* eslint-disable no-console */
    // console.log(iconPos);
    /* eslint-enable no-console */

    // if(!hasPattern && iconPos != -1) {
    //   hasPattern = true
    // }

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
