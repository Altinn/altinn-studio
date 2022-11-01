import React from 'react';
import type { ILanguage } from '../../types';
import { getTranslation } from '../../utils/language';
import type { UiSchemaNode } from '@altinn/schema-model';
import classes from './InlineObject.module.css';

export interface IInlineObjectProps {
  item: UiSchemaNode;
  language: ILanguage;
}

export function InlineObject({ item, language }: IInlineObjectProps) {
  // present as plain json object, not with any meta fields used in UiSchemaItem
  return (
    <div>
      <pre id='json-paper' className={classes.jsonPaper}>
        {JSON.stringify(item, null, '    ')}
      </pre>
      <div id='information-paper' className={classes.informationPaper}>
        {getTranslation('combination_inline_object_disclaimer', language)}
      </div>
    </div>
  );
}
