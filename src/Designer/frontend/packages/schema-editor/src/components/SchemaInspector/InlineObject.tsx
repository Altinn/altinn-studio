import React from 'react';
import type { UiSchemaNode } from '@altinn/schema-model';
import classes from './InlineObject.module.css';
import { useTranslation } from 'react-i18next';

export interface IInlineObjectProps {
  item: UiSchemaNode;
}

export function InlineObject({ item }: IInlineObjectProps) {
  const { t } = useTranslation();
  // present as plain json object, not with any meta fields used in UiSchemaItem
  return (
    <div>
      <pre id='json-paper' className={classes.jsonPaper}>
        {JSON.stringify(item, null, '    ')}
      </pre>
      <div id='information-paper' className={classes.informationPaper}>
        {t('schema_editor.combination_inline_object_disclaimer')}
      </div>
    </div>
  );
}
