import type { CompCapabilities } from 'src/codegen/Config';
import type { CompTypes } from 'src/layout/layout';
import type { ChildClaimerProps } from 'src/layout/LayoutComponent';

export interface ClaimNonRepeatingChildrenOptions<T extends CompTypes> {
  onlyWithCapability?: keyof CompCapabilities;
  componentType: T;
}

export function claimNonRepeatingChildren<T extends CompTypes>(
  { claimChild, getType, getCapabilities }: ChildClaimerProps<T>,
  children: string[] | undefined,
  options: ClaimNonRepeatingChildrenOptions<T>,
): void {
  for (const id of children || []) {
    if (options.onlyWithCapability) {
      const type = getType(id);
      if (!type) {
        continue;
      }
      const capabilities = getCapabilities(type);
      if (!capabilities[options.onlyWithCapability]) {
        window.logWarn(
          `${options.componentType} included a component '${id}', which ` +
            `is a '${type}' and cannot be rendered in a ${options.componentType}.`,
        );
        continue;
      }
    }
    claimChild(id);
  }
}
