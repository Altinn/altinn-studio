import type { LayoutComponent } from '../types';

type ObjectBinding = { field: string; dataType: string };

/**
 * Returns the data model field the component saves its answer in. Apps on app frontend v9 write the
 * binding as an object with the data type; older apps as the field name alone.
 */
export function getBindingField(component: LayoutComponent): string | undefined {
  const binding: unknown = component.dataModelBindings?.simpleBinding;
  if (typeof binding === 'string') return binding || undefined;
  if (isObjectBinding(binding)) return binding.field;
  return undefined;
}

/** Points the component to another field, in the form its binding is already written in. */
export function setBindingField(
  component: LayoutComponent,
  field: string,
  dataType: string,
): LayoutComponent {
  const current: unknown = component.dataModelBindings?.simpleBinding;
  const simpleBinding = typeof current === 'string' ? field : { field, dataType };
  return {
    ...component,
    dataModelBindings: {
      ...component.dataModelBindings,
      simpleBinding,
    } as LayoutComponent['dataModelBindings'],
  };
}

function isObjectBinding(binding: unknown): binding is ObjectBinding {
  return typeof binding === 'object' && binding !== null && 'field' in binding;
}

/** Finds the components that save to each field, so the user sees what a field is used for. */
export function getComponentsByField(
  components: LayoutComponent[],
): Map<string, LayoutComponent[]> {
  const byField = new Map<string, LayoutComponent[]>();
  components.forEach((component) => {
    const field = getBindingField(component);
    if (!field) return;
    byField.set(field, [...(byField.get(field) ?? []), component]);
  });
  return byField;
}
