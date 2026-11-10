import type { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import type { ComponentBase } from '@app/layout-contract/generated/common.generated';
import type { KnownSerializedComponent } from './SerializedComponent';
import type { StringExpression } from '@studio/components';
import type { Summary2OverrideConfig, Summary2TargetConfig } from './Summary2Config';

type EditorOwnedProperty =
  | keyof ComponentBase
  | 'type'
  | 'children'
  | 'dataModelBindings'
  | 'textResourceBindings'
  | 'options';

/** Serialized component properties not represented by common or normalized editor state. */
type EditorDraftProperties<T extends ComponentType> = T extends ComponentType.Text
  ? { value: StringExpression }
  : T extends ComponentType.Summary2
    ? { target: Summary2TargetConfig; overrides?: Summary2OverrideConfig[] }
    : Record<never, never>;

export type ComponentConfig<T extends ComponentType = ComponentType> = T extends ComponentType
  ? Omit<KnownSerializedComponent<T>, EditorOwnedProperty | keyof EditorDraftProperties<T>> &
      EditorDraftProperties<T>
  : never;
