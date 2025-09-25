import type { CompTypes } from 'src/layout/layout';
import type { ChildClaimerProps } from 'src/layout/LayoutComponent';
import type { TabConfig } from 'src/layout/Tabs/config.generated';

export function claimTabsChildren<T extends CompTypes>(
  { claimChild, getType, getCapabilities }: ChildClaimerProps<T>,
  tabs: TabConfig[] | undefined,
): void {
  for (const tab of (tabs || []).values()) {
    for (const child of tab.children.values()) {
      const type = getType(child);
      if (!type) {
        continue;
      }
      const capabilities = getCapabilities(type);
      if (!capabilities.renderInTabs) {
        window.logWarn(
          `Tabs component included a component '${child}', which ` +
            `is a '${type}' and cannot be rendered as a Tabs child.`,
        );
        continue;
      }
      claimChild(child);
    }
  }
}
