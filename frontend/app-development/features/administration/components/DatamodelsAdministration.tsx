import { getLanguageFromKey } from 'app-shared/utils/language';
import React from 'react';

export interface DatamodelsAdministrationProps {
  language: any;
}

export function DatamodelsAdministration({ language }: DatamodelsAdministrationProps) {
  return (
    <div>
      <p>{getLanguageFromKey('administration.datamodels_info1', language)}</p>
      <p>{getLanguageFromKey('administration.datamodels_info2', language)}</p>
      <p>
        {getLanguageFromKey('administration.datamodels_info3', language)}&nbsp;
        <a href='https://docs.altinn.studio/app/development/data/data-model/'>
          {getLanguageFromKey('administration.datamodels_info_link', language)}
        </a>
      </p>
    </div>
  );
}
