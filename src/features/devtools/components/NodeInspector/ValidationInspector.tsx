import React from 'react';

import { EyeSlashIcon } from '@navikt/aksel-icons';

import { isAttachmentUploaded } from 'src/features/attachments';
import { useAttachmentsFor } from 'src/features/attachments/hooks';
import classes from 'src/features/devtools/components/NodeInspector/ValidationInspector.module.css';
import { Lang } from 'src/features/language/Lang';
import { ValidationMask } from 'src/features/validation';
import { isValidationVisible } from 'src/features/validation/utils';
import { implementsAnyValidation } from 'src/layout';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { FileUploaderNode } from 'src/features/attachments';
import type { AttachmentValidation, NodeValidation, ValidationSeverity } from 'src/features/validation';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface ValidationInspectorProps {
  node: LayoutNode;
}

const categories = [
  { name: 'Schema', category: ValidationMask.Schema },
  { name: 'Component', category: ValidationMask.Component },
  { name: 'Expression', category: ValidationMask.Expression },
  { name: 'Custom backend', category: ValidationMask.CustomBackend },
  { name: 'Required', category: ValidationMask.Required },
  { name: 'Standard backend', category: ValidationMask.Backend },
] as const;

export const ValidationInspector = ({ node }: ValidationInspectorProps) => {
  const validations = NodesInternal.useRawValidations(node);
  const nodeVisibility = NodesInternal.useRawValidationVisibility(node);
  const dataModelBindings = useDataModelBindingsFor(node.baseId);
  const type = node.type;
  const attachments = useAttachmentsFor(node as FileUploaderNode);

  if (!implementsAnyValidation(node.def)) {
    return (
      <div style={{ padding: 4 }}>
        <b>{type}</b> implementerer ikke validering.
      </div>
    );
  }

  const componentValidations: NodeValidation[] = validations.map((validation) => ({ ...validation, node })) ?? [];

  // Validations that are not bound to any data model field or attachment
  const unboundComponentValidations = componentValidations.filter(
    (validation) => !('bindingKey' in validation) && !('attachmentId' in validation),
  );

  // Validations for attachments
  const attachmentValidations: {
    [key: string]: { attachmentVisibility: number; validations: NodeValidation<AttachmentValidation>[] };
  } = componentValidations.reduce((obj, val) => {
    const attachmentValidation = 'attachmentId' in val ? val : undefined;
    if (attachmentValidation) {
      const attachmentId = attachmentValidation.attachmentId;
      const attachment = attachments.find((a) => isAttachmentUploaded(a) && a.data.id === attachmentId);
      const key = `Vedlegg ${attachment?.data.filename ?? attachmentId}`;
      if (!obj[key]) {
        const attachmentVisibility = nodeVisibility | (attachmentValidation.visibility ?? 0);
        obj[key] = { attachmentVisibility, validations: [] };
      }
      obj[key].validations.push(val);
    }
    return obj;
  }, {});

  // Validations for data model bindings
  const bindingValidations: { [key: string]: NodeValidation[] } = {};
  for (const bindingKey of Object.keys(dataModelBindings ?? {})) {
    const key = `Datamodell ${bindingKey}`;

    const validationsForKey = componentValidations.filter((v) => 'bindingKey' in v && v.bindingKey === bindingKey);
    bindingValidations[key] = validationsForKey.map((validation) => ({ ...validation, node }));
  }

  return (
    <div style={{ padding: 4 }}>
      <CategoryVisibility mask={nodeVisibility} />
      <ValidationItems
        grouping='Komponent'
        validations={unboundComponentValidations}
        visibility={nodeVisibility}
      />
      {Object.entries(bindingValidations).map(([binding, validations]) => (
        <ValidationItems
          key={binding}
          grouping={binding}
          validations={validations}
          visibility={nodeVisibility}
        />
      ))}
      {Object.entries(attachmentValidations).map(([attachment, { attachmentVisibility, validations }]) => (
        <ValidationItems
          key={attachment}
          grouping={attachment}
          validations={validations}
          visibility={attachmentVisibility}
        />
      ))}
    </div>
  );
};

const CategoryVisibility = ({ mask }: { mask: number }) => (
  <>
    <b>Synlige valideringstyper på noden:</b>
    <div className={classes.categoryList}>
      {categories.map(({ name, category }) => {
        const isVisible = (mask & category) > 0;
        return (
          <div
            key={name}
            className={classes.category}
            style={{ backgroundColor: isVisible ? 'lightgreen' : 'lightgray' }}
            title={isVisible ? 'Valideringstypen er synlig' : 'Valideringstypen er skjult'}
          >
            {name}
          </div>
        );
      })}
    </div>
  </>
);

interface ValidationItemsProps {
  grouping: string;
  validations: NodeValidation[];
  visibility: number;
}
const ValidationItems = ({ grouping, validations, visibility }: ValidationItemsProps) => {
  if (!validations?.length) {
    return null;
  }

  return (
    <>
      <b>{grouping}:</b>
      <ul style={{ padding: 0 }}>
        {validations.map((validation) => (
          <ValidationItem
            key={`${validation.node.id}-${validation.source}-${validation.message.key}-${validation.severity}`}
            validation={validation}
            visibility={visibility}
          />
        ))}
      </ul>
    </>
  );
};

interface ValidationItemProps {
  validation: NodeValidation;
  visibility: number;
}
const ValidationItem = ({ validation, visibility }: ValidationItemProps) => {
  // Ignore old severities which are no longer supported
  if (!['error', 'warning', 'info', 'success'].includes(validation.severity)) {
    return null;
  }

  const color = getColor(validation.severity);

  const isVisible = isValidationVisible(validation, visibility);
  const category = categories.find((c) => validation.category === c.category);

  return (
    <li className={classes.listItem}>
      <div style={{ color }}>
        {!isVisible && (
          <EyeSlashIcon
            style={{ marginRight: '6px' }}
            title='Denne valideringen er skjult'
          />
        )}
        <Lang
          id={validation.message.key}
          params={validation.message.params}
        />
      </div>
      {category && (
        <span
          className={classes.listItemCategory}
          style={{ backgroundColor: isVisible ? 'lightgreen' : 'lightgray' }}
          title={isVisible ? 'Valideringstypen er synlig' : 'Valideringstypen er skjult'}
        >
          {category.name}
        </span>
      )}
    </li>
  );
};

function getColor(severity: ValidationSeverity) {
  switch (severity) {
    case 'error':
      return 'red';
    case 'warning':
      return 'orange';
    case 'info':
      return 'blue';
    case 'success':
      return 'green';
  }
}
