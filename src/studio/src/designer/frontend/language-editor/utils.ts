export interface ILanguageEditor {
  languages: {
    [languageKey: string]: Record<string, string>;
  };
  addNewSprak: (addNewSprakKey: any) => void;
  setAddNewSprak: (setAddNewSprakKey: any) => void;
  isNewTextInput: boolean;
  setIsNewTextInput: (isNewTextInput: boolean) => void;
  sprak: { [key: string]: any };
  setSprak: (sprak: { [key: string]: any }) => void;
  selectedSprak: string;
  setSelectedSprak: (selectedSprak: string) => void;
  sprakOptions: { [key: string]: any };
  setSprakOptions: (sprakOptions: { [key: string]: any }) => void;
  newSprakField: { [key: string]: any };
  setNewSprakField: (newSprakField: { [key: string]: any }) => void;
}

interface ITransformLanguagesProps extends ILanguageEditor {
  translationKeys: {
    [translationKey: string]: string;
  };
}

export const getAllTranslationKeys = ({ languages }: ILanguageEditor) => {
  if (!languages) {
    return {};
  }

  return Object.values(languages).reduce((acc, curr) => {
    acc = {
      ...acc,
      ...curr,
    };
    return acc;
  }, {});
};

export const transformLanguages = ({
  translationKeys,
  languages,
}: ITransformLanguagesProps) => {
  return Object.keys(translationKeys).reduce((acc, curr) => {
    const translations = Object.keys(languages).map((langCode) => {
      return {
        [langCode]: languages[langCode][curr] || '',
      };
    });

    let flattened = {};

    translations.forEach((o) => {
      flattened = {
        ...flattened,
        ...o,
      };
    });

    const item = {
      [`${curr}`]: flattened,
    };

    acc = {
      ...acc,
      ...item,
    };
    return acc;
  }, {});
};
