import React from 'react';
import { HelpTextContainer } from 'src/features/form/components/HelpTextContainer';

export function insertHelpIconInText (element, language, id, text) {
  const replacePattern = '{help}';
  // const iconPos = element.indexOf(replacePattern);

  for(var j=0; j < element.length; j++){
    if(element[j]['props']) {
      if(element[j]['props']['children']) {
        insertHelpIconInText(element[j]['props']['children'], language, id, text)
      }
    } else {
      const iconPos = element[j].indexOf(replacePattern);
      if(element[j].indexOf(replacePattern) !== -1) {
          element[j] = 
            <> 
              {element[j].substring(0, iconPos)} 
                <HelpTextContainer
                  language={language}
                  id={id}
                  helpText={text}
                /> 
              {element[j].substring(iconPos + replacePattern.length)}
            </>;
      }
    }
  }
};

export function insertHelpIconInHeader (element, language, id, text) {
  const replacePattern = '{help}';
  const iconPos = element.indexOf(replacePattern);

  if(element.indexOf(replacePattern) !== -1) {
    return (
      <> 
        {element.substring(0, iconPos)} 
          <HelpTextContainer
            language={language}
            id={id}
            helpText={text}
          />
        {element.substring(iconPos + replacePattern.length)}
      </>
    ); 
  }
};


