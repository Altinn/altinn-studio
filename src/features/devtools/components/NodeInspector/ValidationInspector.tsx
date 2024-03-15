import React from 'react';

import { EyeSlashIcon } from '@navikt/aksel-icons';

import { isAttachmentUploaded } from 'src/features/attachments';
import { useAttachments } from 'src/features/attachments/AttachmentsContext';
import classes from 'src/features/devtools/components/NodeInspector/ValidationInspector.module.css';
import { Lang } from 'src/features/language/Lang';
import { type NodeValidation, ValidationMask, type ValidationSeverity } from 'src/features/validation';
import { buildNodeValidation, isValidationVisible } from 'src/features/validation/utils';
import { Validation } from 'src/features/validation/validationContext';
import {
  getResolvedVisibilityForAttachment,
  getVisibilityForNode,
} from 'src/features/validation/visibility/visibilityUtils';
import { implementsAnyValidation, implementsValidationFilter } from 'src/layout';
import type { ValidationFilterFunction } from 'src/layout';
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
  const fieldSelector = Validation.useFieldSelector();
  const componentSelector = Validation.useComponentSelector();
  const visibilitySelector = Validation.useVisibilitySelector();
  const attachments = useAttachments();

  if (!implementsAnyValidation(node.def)) {
    return (
      <div style={{ padding: 4 }}>
        <b>{node.item.type}</b> implementerer ikke validering.
      </div>
    );
  }

  const nodeVisibility = getVisibilityForNode(node, visibilitySelector);
  const filters = implementsValidationFilter(node.def) ? node.def.getValidationFilters(node as any) : [];
  const component = componentSelector(node.item.id, (components) => components[node.item.id]);
  const componentValidations = component?.component?.map((validation) => buildNodeValidation(node, validation)) ?? [];

  // Validations that are not bound to any datamodel field or attachment
  const unboundComponentValidations = componentValidations.filter((validation) => !validation.meta?.attachmentId);

  // Validations for attachments
  const attachmentValidations: { [key: string]: { attachmentVisibility: number; validations: NodeValidation[] } } =
    componentValidations.reduce((obj, val) => {
      const attachmentId = val.meta?.attachmentId;
      if (attachmentId) {
        const attachment = attachments[node.item.id]?.find(
          (a) => isAttachmentUploaded(a) && a.data.id === attachmentId,
        );
        const key = `Vedlegg ${attachment?.data.filename ?? attachmentId}`;
        if (!obj[key]) {
          const attachmentVisibility = getResolvedVisibilityForAttachment(attachmentId, node, visibilitySelector);
          obj[key] = { attachmentVisibility, validations: [] };
        }
        obj[key].validations.push(val);
      }
      return obj;
    }, {});

  // Validations for datamodel bindings
  const bindingValidations: { [key: string]: NodeValidation[] } = {};
  for (const [bindingKey, field] of Object.entries(node.item.dataModelBindings ?? {})) {
    const key = `Datamodell ${bindingKey}`;
    bindingValidations[key] = [];

    const fieldValidation = fieldSelector(field, (fields) => fields[field]);
    if (fieldValidation) {
      bindingValidations[key].push(
        ...fieldValidation.map((validation) => buildNodeValidation(node, validation, bindingKey)),
      );
    }
    if (component?.bindingKeys?.[bindingKey]) {
      bindingValidations[key].push(
        ...component.bindingKeys[bindingKey].map((validation) => buildNodeValidation(node, validation, bindingKey)),
      );
    }
  }

  return (
    <div style={{ padding: 4 }}>
      <CategoryVisibility mask={nodeVisibility} />
      <ValidationItems
        grouping='Komponent'
        validations={unboundComponentValidations}
        node={node}
        visibility={nodeVisibility}
        filters={filters}
      />
      {Object.entries(bindingValidations).map(([binding, validations]) => (
        <ValidationItems
          key={binding}
          grouping={binding}
          validations={validations}
          node={node}
          visibility={nodeVisibility}
          filters={filters}
        />
      ))}
      {Object.entries(attachmentValidations).map(([attachment, { attachmentVisibility, validations }]) => (
        <ValidationItems
          key={attachment}
          grouping={attachment}
          validations={validations}
          node={node}
          visibility={attachmentVisibility}
          filters={filters}
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
  node: LayoutNode;
  visibility: number;
  filters: ValidationFilterFunction[];
}
const ValidationItems = ({ grouping, validations, node, visibility, filters }: ValidationItemsProps) => {
  if (!validations?.length) {
    return null;
  }

  return (
    <>
      <b>{grouping}:</b>
      <ul style={{ padding: 0 }}>
        {validations.map((validation) => (
          <ValidationItem
            key={`${validation.source}-${validation.message.key}-${validation.severity}`}
            validation={validation}
            node={node}
            visibility={visibility}
            filters={filters}
          />
        ))}
      </ul>
    </>
  );
};

interface ValidationItemProps {
  validation: NodeValidation;
  node: LayoutNode;
  visibility: number;
  filters: ValidationFilterFunction[];
}
const ValidationItem = ({ validation, node, visibility, filters }: ValidationItemProps) => {
  // Ignore old severities which are no longer supported
  if (!['error', 'warning', 'info', 'success'].includes(validation.severity)) {
    return null;
  }

  const color = getColor(validation.severity);

  const isVisible = isValidationVisible(validation, visibility);
  const category = categories.find((c) => validation.category === c.category);

  const isFiltered = filters.some((filter) => !filter(validation, 0, [validation]));
  return (
    <li
      className={classes.listItem}
      title={isFiltered ? 'Denne valideringen er filtrert bort' : undefined}
    >
      <div style={{ color, textDecoration: isFiltered ? 'line-through' : 'none' }}>
        {!isVisible && (
          <EyeSlashIcon
            style={{ marginRight: '6px' }}
            title='Denne valideringen er skjult'
          />
        )}
        <Lang
          id={validation.message.key}
          params={validation.message.params}
          node={node}
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
