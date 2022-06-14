import React from "react";

interface ILanguageEditorProps {
  languages: {
    [languageKey: string]: Record<string, string>
  }
}

export const LanguageEditor = ({languages}: ILanguageEditorProps) => {

  console.log(languages);

  return <div>LanguageEditor</div>
}

/*
const languages = {
  nb: {
    key: "value",
    key2: "value",
    // nested: {
    //   nested1: "nestedVal"
    // },
    "nested.nested2": "nestedVal",
    key3: "value"
  },
  en:  {
    key: "value",
    key2: "value",
    key3: "value"
  },
}
 */
