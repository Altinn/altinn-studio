import type { CompTypes } from 'src/layout/layout';
import type { ChildClaimerProps } from 'src/layout/LayoutComponent';

export interface ClaimRepeatingChildrenOptions {
  multiPage?: boolean;
}

export function getRepeatingChildBaseId(id: string, multiPage: boolean): string {
  return multiPage ? id.split(':', 2)[1] : id;
}

export function getRepeatingChildBaseIds(children: string[], multiPage: boolean): string[] {
  return children.map((id) => getRepeatingChildBaseId(id, multiPage));
}

export function isRepeatingChild(children: string[], multiPage: boolean, baseComponentId: string): boolean {
  return children.some((id) => getRepeatingChildBaseId(id, multiPage) === baseComponentId);
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

      claimChild(getRepeatingChildBaseId(id, true));
    } else {
      claimChild(id);
    }
  }
}
