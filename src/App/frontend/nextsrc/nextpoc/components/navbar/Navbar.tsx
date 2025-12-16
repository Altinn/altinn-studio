import React from 'react';
import { useParams } from 'react-router-dom';

import cn from 'classnames';
import { ButtonLink } from 'nextsrc/nextpoc/components/navbar/ButtonLink';
import classes from 'nextsrc/nextpoc/components/navbar/Navbar.module.css';
import { layoutStore } from 'nextsrc/nextpoc/stores/layoutStore';
import { textResourceStore } from 'nextsrc/nextpoc/stores/textResourceStore';
import { useStore } from 'zustand/index';

import { Flex } from 'src/app-components/Flex/Flex';
import { useIsMobile } from 'src/hooks/useDeviceWidths';
import type { CompIntermediateExact } from 'src/layout/layout';

interface NavbarProps {
  component: CompIntermediateExact<'NavigationBar'>;
}

export const Navbar: React.FunctionComponent<NavbarProps> = (component) => {
  const pages = useStore(layoutStore, (state) => state.pageOrder.pages);
  const textResource = useStore(textResourceStore, (state) => state.textResource?.resources);
  const isMobile = useIsMobile();
  const { pageId } = useParams();

  if (!textResource) {
    throw new Error('no text resources');
  }

  const resolvedPageNames = React.useMemo(
    () =>
      pages?.order?.map((page) => {
        const text = textResource.find((resource) => resource.id === page);

        const isCurrent = page === pageId;

        if (text) {
          return { path: page, label: text.value, isCurrent };
        }
        return { path: page, label: page, isCurrent };
      }),
    [pageId, pages?.order, textResource],
  );

  return (
    <Flex
      id={`form-content-${12}`}
      size={{ xs: 12, ...component.component.grid?.innerGrid }}
      item
    >
      <Flex container>
        <Flex
          data-testid='NavigationBar'
          item
          component='nav'
          size={{ xs: 12 }}
          role='navigation'
          aria-label='general.navigation_form'
        >
          <ul
            id='navigation-menu'
            data-testid='navigation-menu'
            className={cn(classes.menu, {
              [classes.menuCompact]: isMobile,
            })}
          >
            {resolvedPageNames?.map((page, index) => (
              <li
                className={classes.containerBase}
                key={index}
              >
                <ButtonLink
                  to={`../${page.path}`}
                  isCurrent={page.isCurrent}
                  className={cn(classes.buttonBase, {
                    [classes.buttonSelected]: page.isCurrent,
                    [classes.hidden]: false,
                  })}
                >
                  {index + 1}. {page.label}
                </ButtonLink>
              </li>
            ))}
          </ul>
        </Flex>
      </Flex>
    </Flex>
  );
};
