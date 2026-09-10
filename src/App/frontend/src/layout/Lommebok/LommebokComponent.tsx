import React from 'react';

import { Lommebok } from '@app/form-component';

import { DocumentRequestItem } from 'src/layout/Lommebok/DocumentRequestItem';
import { IssueDocumentItem } from 'src/layout/Lommebok/IssueDocumentItem';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function LommebokComponent({ baseComponentId }: PropsFromGenericComponent<'Lommebok'>) {
  const { request, issue, textResourceBindings } = useItemWhenType(baseComponentId, 'Lommebok');
  const { componentId } = useComponentStructureData(baseComponentId);

  return (
    <Lommebok
      componentId={componentId}
      title={textResourceBindings?.title}
      description={textResourceBindings?.description}
    >
      {request?.map((doc) => (
        <DocumentRequestItem
          key={doc.type}
          baseComponentId={baseComponentId}
          doc={doc}
        />
      ))}

      {issue?.map((doc) => (
        <IssueDocumentItem
          key={doc.type}
          doc={doc}
        />
      ))}
    </Lommebok>
  );
}
