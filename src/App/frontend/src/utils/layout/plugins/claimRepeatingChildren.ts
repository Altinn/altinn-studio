import type { CompTypes } from 'src/layout/layout';
import type { ChildClaimerProps } from 'src/layout/LayoutComponent';

export interface ClaimRepeatingChildrenOptions {
  multiPage?: boolean;
}

export function claimRepeatingChildren<T extends CompTypes>(
  { claimChild }: ChildClaimerProps<T>,
  children: string[] | undefined,
  options: ClaimRepeatingChildrenOptions,
): void {
  for (const id of children || []) {
    if (options.multiPage) {
      if (!/^\d+:[^:]+$/u.test(id)) {
        throw new Error(
          `Ved bruk av multiPage må ID være på formatet 'sideIndeks:komponentId' (f.eks. '0:komponentId'). Referansen '${id}' er ikke gyldig.`,
        );
      }

      const [, childId] = id.split(':', 2);
      claimChild(childId);
    } else {
      claimChild(id);
    }
  }
}
