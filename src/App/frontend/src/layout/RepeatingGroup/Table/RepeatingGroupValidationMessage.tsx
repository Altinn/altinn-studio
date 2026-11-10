import React, { Children, cloneElement, isValidElement } from 'react';
import type { ReactNode } from 'react';

import { Link, ValidationMessage } from '@digdir/designsystemet-react';

import { FormStore } from 'src/features/form/FormContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguageWithForcedPath } from 'src/features/language/useLanguage';
import { useNavigateToComponent } from 'src/hooks/useNavigatePage';
import utilClasses from 'src/styles/utils.module.css';
import { getDataModelLocationForIndexedNode } from 'src/utils/layout/hierarchy';
import type { NodeRefValidation } from 'src/features/validation';

export function RepeatingGroupValidationMessage({
  validation,
  onNavigate,
}: {
  validation: NodeRefValidation;
  onNavigate?: () => void;
}) {
  const location = getDataModelLocationForIndexedNode(validation.nodeId, FormStore.bootstrap.useLayoutLookups());
  const path =
    location.groupBinding && location.rowIndex !== undefined
      ? { ...location.groupBinding, field: `${location.groupBinding.field}[${location.rowIndex}]` }
      : undefined;
  const { lang } = useLanguageWithForcedPath(path);
  const navigate = useNavigateToComponent();
  const message = lang(
    validation.message.key,
    validation.message.params,
    validation.message.customTextParameters,
    validation.message.fallback,
  );

  return (
    <ValidationMessage
      asChild
      data-size='md'
      data-color={validation.severity === 'error' ? 'danger' : validation.severity}
    >
      <div>
        <span className={utilClasses.visuallyHidden}>
          <Lang id={`group.validation_severity_${validation.severity}`} />
        </span>
        {onNavigate ? (
          <NavigableMessage
            nodeId={validation.nodeId}
            onNavigate={() => {
              onNavigate();
              void navigate(validation.nodeId, validation.baseComponentId, { error: validation });
            }}
          >
            {message}
          </NavigableMessage>
        ) : (
          message
        )}
      </div>
    </ValidationMessage>
  );
}

// Parsed messages can contain external or app-specific links. Leave those links independent
// of field navigation so they keep their own destinations and never sit inside a button.
// Only known phrasing elements may be placed inside a navigation button. Keep flow
// containers and custom components intact and navigate from the text inside them.
function isNavigablePhrasing(node: ReactNode): boolean {
  if (!isValidElement<{ children?: ReactNode }>(node)) {
    return true;
  }
  return (
    typeof node.type === 'string' &&
    ['span', 'strong', 'em', 'b', 'i', 'u', 's', 'small', 'sub', 'sup', 'code', 'abbr', 'br'].includes(node.type) &&
    !isMessageLink(node) &&
    Children.toArray(node.props.children).every(isNavigablePhrasing)
  );
}

function hasNavigableText(node: ReactNode): boolean {
  return Children.toArray(node).some((child) =>
    isValidElement<{ children?: ReactNode }>(child)
      ? hasNavigableText(child.props.children)
      : /[\p{L}\p{N}]/u.test(String(child)),
  );
}

function isMessageLink(node: React.ReactElement<{ children?: ReactNode }>): boolean {
  return 'href' in node.props || 'to' in node.props || 'setting' in node.props;
}

export function NavigableMessage({
  children,
  onNavigate,
  nodeId,
}: {
  children: ReactNode;
  onNavigate: () => void;
  nodeId: string;
}): ReactNode {
  const parts: ReactNode[] = [];
  let text: ReactNode[] = [];
  const flushText = () => {
    if (text.length === 0) {
      return;
    }
    if (!hasNavigableText(text)) {
      parts.push(...text);
      text = [];
      return;
    }
    const lastPart = text.at(-1);
    const trailingSpace = typeof lastPart === 'string' ? lastPart.match(/\s+$/)?.[0] : undefined;
    if (trailingSpace && typeof lastPart === 'string') {
      text[text.length - 1] = lastPart.trimEnd();
    }
    parts.push(
      <Link
        key={parts.length}
        asChild
        data-color='neutral'
      >
        <button
          type='button'
          onClick={onNavigate}
          data-target-node={nodeId}
        >
          {text}
        </button>
      </Link>,
    );
    if (trailingSpace) {
      parts.push(trailingSpace);
    }
    text = [];
  };

  for (const child of Children.toArray(children)) {
    if (isNavigablePhrasing(child)) {
      text.push(child);
      continue;
    }
    flushText();
    if (!isValidElement<{ children?: ReactNode }>(child)) {
      continue;
    }
    parts.push(
      isMessageLink(child) || child.props.children === undefined
        ? child
        : cloneElement(
            child,
            {},
            <NavigableMessage
              onNavigate={onNavigate}
              nodeId={nodeId}
            >
              {child.props.children}
            </NavigableMessage>,
          ),
    );
  }
  flushText();
  return parts;
}
