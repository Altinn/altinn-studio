'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [6013],
  {
    './src/components/StudioAnimateHeight/StudioAnimateHeight.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { H: () => StudioAnimateHeight });
      var react = __webpack_require__('../../../node_modules/react/index.js'),
        classnames = __webpack_require__('../../../node_modules/classnames/index.js'),
        classnames_default = __webpack_require__.n(classnames),
        injectStylesIntoStyleTag = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js',
        ),
        injectStylesIntoStyleTag_default = __webpack_require__.n(injectStylesIntoStyleTag),
        styleDomAPI = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/styleDomAPI.js',
        ),
        styleDomAPI_default = __webpack_require__.n(styleDomAPI),
        insertBySelector = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/insertBySelector.js',
        ),
        insertBySelector_default = __webpack_require__.n(insertBySelector),
        setAttributesWithoutAttributes = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js',
        ),
        setAttributesWithoutAttributes_default = __webpack_require__.n(
          setAttributesWithoutAttributes,
        ),
        insertStyleElement = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/insertStyleElement.js',
        ),
        insertStyleElement_default = __webpack_require__.n(insertStyleElement),
        styleTagTransform = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/styleTagTransform.js',
        ),
        styleTagTransform_default = __webpack_require__.n(styleTagTransform),
        StudioAnimateHeight_module = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioAnimateHeight/StudioAnimateHeight.module.css',
        ),
        options = {};
      (options.styleTagTransform = styleTagTransform_default()),
        (options.setAttributes = setAttributesWithoutAttributes_default()),
        (options.insert = insertBySelector_default().bind(null, 'head')),
        (options.domAPI = styleDomAPI_default()),
        (options.insertStyleElement = insertStyleElement_default());
      injectStylesIntoStyleTag_default()(StudioAnimateHeight_module.A, options);
      const StudioAnimateHeight_StudioAnimateHeight_module =
        StudioAnimateHeight_module.A && StudioAnimateHeight_module.A.locals
          ? StudioAnimateHeight_module.A.locals
          : void 0;
      var hooks = __webpack_require__('./src/hooks/index.ts');
      const StudioAnimateHeight = ({ children, className, open = !1, style, ...rest }) => {
        const [height, setHeight] = (0, react.useState)(0),
          prevOpen = (0, hooks.ZC)(open),
          openOrClosed = open ? 'open' : 'closed',
          [state, setState] = (0, react.useState)(openOrClosed),
          timeoutRef = (0, react.useRef)(null),
          shouldAnimate = !(0, hooks.Ub)('(prefers-reduced-motion)'),
          contentRef = (0, react.useCallback)(
            (node) => {
              if (node) {
                new ResizeObserver(() => {
                  setHeight(open ? node.getBoundingClientRect().height : 0);
                }).observe(node);
              }
              void 0 !== prevOpen &&
                prevOpen !== open &&
                (setState(shouldAnimate ? 'openingOrClosing' : openOrClosed),
                timeoutRef.current && clearTimeout(timeoutRef.current),
                (timeoutRef.current = setTimeout(() => {
                  setState(openOrClosed);
                }, 250)));
            },
            [open, openOrClosed, prevOpen, shouldAnimate],
          ),
          transition = 'openingOrClosing' === state ? 'height 250ms ease-in-out' : void 0;
        return react.createElement(
          'div',
          {
            ...rest,
            className: classnames_default()(
              StudioAnimateHeight_StudioAnimateHeight_module.root,
              StudioAnimateHeight_StudioAnimateHeight_module[state],
              className,
            ),
            style: { height, transition, ...style },
          },
          react.createElement(
            'div',
            { ref: contentRef, className: StudioAnimateHeight_StudioAnimateHeight_module.content },
            children,
          ),
        );
      };
      StudioAnimateHeight.__docgenInfo = {
        description:
          'AnimateHeight is a component that animates its height when the `open` prop changes.',
        methods: [],
        displayName: 'StudioAnimateHeight',
        props: {
          open: {
            required: !1,
            tsType: { name: 'boolean' },
            description: '',
            defaultValue: { value: 'false', computed: !1 },
          },
        },
      };
    },
    './src/components/StudioAnimateHeight/index.ts': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, {
        H: () => _StudioAnimateHeight__WEBPACK_IMPORTED_MODULE_0__.H,
      });
      var _StudioAnimateHeight__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
        './src/components/StudioAnimateHeight/StudioAnimateHeight.tsx',
      );
    },
    './src/components/StudioButton/StudioButton.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { r: () => StudioButton });
      var Button = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Button/Button.js',
        ),
        react = __webpack_require__('../../../node_modules/react/index.js'),
        classnames = __webpack_require__('../../../node_modules/classnames/index.js'),
        classnames_default = __webpack_require__.n(classnames),
        injectStylesIntoStyleTag = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js',
        ),
        injectStylesIntoStyleTag_default = __webpack_require__.n(injectStylesIntoStyleTag),
        styleDomAPI = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/styleDomAPI.js',
        ),
        styleDomAPI_default = __webpack_require__.n(styleDomAPI),
        insertBySelector = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/insertBySelector.js',
        ),
        insertBySelector_default = __webpack_require__.n(insertBySelector),
        setAttributesWithoutAttributes = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js',
        ),
        setAttributesWithoutAttributes_default = __webpack_require__.n(
          setAttributesWithoutAttributes,
        ),
        insertStyleElement = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/insertStyleElement.js',
        ),
        insertStyleElement_default = __webpack_require__.n(insertStyleElement),
        styleTagTransform = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/styleTagTransform.js',
        ),
        styleTagTransform_default = __webpack_require__.n(styleTagTransform),
        StudioButton_module = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioButton/StudioButton.module.css',
        ),
        options = {};
      (options.styleTagTransform = styleTagTransform_default()),
        (options.setAttributes = setAttributesWithoutAttributes_default()),
        (options.insert = insertBySelector_default().bind(null, 'head')),
        (options.domAPI = styleDomAPI_default()),
        (options.insertStyleElement = insertStyleElement_default());
      injectStylesIntoStyleTag_default()(StudioButton_module.A, options);
      const StudioButton_StudioButton_module =
          StudioButton_module.A && StudioButton_module.A.locals
            ? StudioButton_module.A.locals
            : void 0,
        StudioButton = (0, react.forwardRef)(
          (
            {
              icon,
              iconPlacement = 'left',
              size = 'small',
              children,
              className: givenClassName,
              color,
              ...rest
            },
            ref,
          ) => {
            const iconComponent = react.createElement(
                'span',
                { 'aria-hidden': !0, className: StudioButton_StudioButton_module.iconWrapper },
                icon,
              ),
              classNames = classnames_default()(
                givenClassName,
                StudioButton_StudioButton_module.studioButton,
                {
                  [StudioButton_StudioButton_module.inverted]: 'inverted' === color,
                  [StudioButton_StudioButton_module.small]: 'small' === size,
                },
              ),
              selectedColor = 'inverted' === color ? void 0 : color;
            return react.createElement(
              Button.$,
              { ...rest, color: selectedColor, className: classNames, icon: !children, size, ref },
              icon
                ? react.createElement(
                    'span',
                    { className: StudioButton_StudioButton_module.innerContainer },
                    'left' === iconPlacement && iconComponent,
                    children,
                    'right' === iconPlacement && iconComponent,
                  )
                : children,
            );
          },
        );
      (StudioButton.displayName = 'StudioButton'),
        (StudioButton.__docgenInfo = {
          description: '',
          methods: [],
          displayName: 'StudioButton',
          props: {
            iconPlacement: { defaultValue: { value: "'left'", computed: !1 }, required: !1 },
            size: { defaultValue: { value: "'small'", computed: !1 }, required: !1 },
          },
        });
    },
    './src/components/StudioButton/index.ts': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, {
        r: () => _StudioButton__WEBPACK_IMPORTED_MODULE_0__.r,
      });
      var _StudioButton__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
        './src/components/StudioButton/StudioButton.tsx',
      );
    },
    './src/components/StudioTreeView/index.ts': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { c: () => StudioTreeView });
      var react = __webpack_require__('../../../node_modules/react/index.js'),
        injectStylesIntoStyleTag = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js',
        ),
        injectStylesIntoStyleTag_default = __webpack_require__.n(injectStylesIntoStyleTag),
        styleDomAPI = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/styleDomAPI.js',
        ),
        styleDomAPI_default = __webpack_require__.n(styleDomAPI),
        insertBySelector = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/insertBySelector.js',
        ),
        insertBySelector_default = __webpack_require__.n(insertBySelector),
        setAttributesWithoutAttributes = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js',
        ),
        setAttributesWithoutAttributes_default = __webpack_require__.n(
          setAttributesWithoutAttributes,
        ),
        insertStyleElement = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/insertStyleElement.js',
        ),
        insertStyleElement_default = __webpack_require__.n(insertStyleElement),
        styleTagTransform = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/style-loader/dist/runtime/styleTagTransform.js',
        ),
        styleTagTransform_default = __webpack_require__.n(styleTagTransform),
        StudioTreeViewRoot_module = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioTreeView/StudioTreeViewRoot/StudioTreeViewRoot.module.css',
        ),
        options = {};
      (options.styleTagTransform = styleTagTransform_default()),
        (options.setAttributes = setAttributesWithoutAttributes_default()),
        (options.insert = insertBySelector_default().bind(null, 'head')),
        (options.domAPI = styleDomAPI_default()),
        (options.insertStyleElement = insertStyleElement_default());
      injectStylesIntoStyleTag_default()(StudioTreeViewRoot_module.A, options);
      const StudioTreeViewRoot_StudioTreeViewRoot_module =
        StudioTreeViewRoot_module.A && StudioTreeViewRoot_module.A.locals
          ? StudioTreeViewRoot_module.A.locals
          : void 0;
      class StringUtils {
        static removeStart = (str, ...substrings) => {
          const lowerCaseStr = str.toLowerCase();
          for (const substring of substrings)
            if (lowerCaseStr.startsWith(substring.toLowerCase()))
              return str.slice(substring.length);
          return str;
        };
        static removeEnd = (str, ...substrings) => {
          const lowerCaseStr = str.toLowerCase();
          for (const substring of substrings)
            if (lowerCaseStr.endsWith(substring.toLowerCase()))
              return str.slice(0, -substring.length);
          return str;
        };
      }
      const makeDomTreeItemId = (rootId, id) => `${rootId}-${id}-treeitem`,
        extractIdFromTreeItem = (rootId, id) =>
          id
            ? StringUtils.removeEnd(StringUtils.removeStart(id, rootId + '-'), '-treeitem')
            : void 0,
        makeDomGroupId = (rootId, id) => `${rootId}-${id}-group`,
        findTreeItem = (rootId, id) => document.getElementById(makeDomTreeItemId(rootId, id)),
        findDirectChildIds = (rootId, nodeId) => {
          const list = nodeId
            ? ((rootId, id) => document.getElementById(makeDomGroupId(rootId, id)))(rootId, nodeId)
            : document.getElementById(rootId);
          if (!list) return [];
          const level = ((rootId, nodeId) =>
              nodeId ? parseInt(findTreeItem(rootId, nodeId)?.getAttribute('aria-level')) : 0)(
              rootId,
              nodeId,
            ),
            childItems = list.querySelectorAll(`[role="treeitem"][aria-level="${level + 1}"]`);
          return Array.from(childItems).map((item) => extractIdFromTreeItem(rootId, item.id));
        },
        findParentId = (rootId, nodeId) => {
          const parentItem = findTreeItem(rootId, nodeId).closest('[role="group"], [role="tree"]'),
            { id } = parentItem;
          return id === rootId
            ? null
            : ((rootId, id) =>
                id
                  ? StringUtils.removeEnd(StringUtils.removeStart(id, rootId + '-'), '-group')
                  : void 0)(rootId, id);
        },
        findAllNodeIds = (rootId) => {
          const items = document.getElementById(rootId).querySelectorAll('[role="treeitem"]');
          return Array.from(items).map((item) => extractIdFromTreeItem(rootId, item.id));
        },
        isNodeVisible = (rootId, nodeId) => {
          const parentIds = ((rootId, nodeId) => {
            const parentIds = [];
            let parentId = findParentId(rootId, nodeId);
            for (; parentId; )
              parentIds.push(parentId), (parentId = findParentId(rootId, parentId));
            return parentIds;
          })(rootId, nodeId);
          return parentIds.every((id) => {
            const treeItem = findTreeItem(rootId, id);
            return treeItem && 'true' === treeItem.getAttribute('aria-expanded');
          });
        },
        findAllVisibleNodeIds = (rootId) =>
          findAllNodeIds(rootId).filter((id) => isNodeVisible(rootId, id)),
        findFirstNodeId = (rootId) => findAllNodeIds(rootId)[0] || null;
      var classnames = __webpack_require__('../../../node_modules/classnames/index.js'),
        classnames_default = __webpack_require__.n(classnames);
      const StudioTreeViewRoot = ({
        children,
        className,
        onSelect,
        selectedId: selectedIdFromProps,
        ...rest
      }) => {
        const rootId = (0, react.useId)(),
          [selectedId, setSelectedId] = (0, react.useState)(selectedIdFromProps),
          [focusedId, setFocusedId] = (0, react.useState)(void 0),
          [focusableId, setFocusableId] = (0, react.useState)(null);
        (0, react.useEffect)(() => {
          setSelectedId(selectedIdFromProps);
        }, [selectedIdFromProps]),
          (0, react.useLayoutEffect)(() => {
            const firstNodeId = findFirstNodeId(rootId);
            setFocusableId(
              ((focusedId, selectedId, firstItemId) => focusedId || selectedId || firstItemId)(
                focusedId,
                selectedId,
                firstNodeId,
              ),
            );
          }, [rootId, selectedId, focusedId]);
        return react.createElement(
          StudioTreeViewRootContext.Provider,
          {
            value: {
              focusedId,
              rootId,
              selectedId,
              setFocusedId,
              setSelectedId: (nodeId) => {
                setSelectedId(nodeId), onSelect?.(nodeId);
              },
              focusableId,
            },
          },
          react.createElement(
            'ul',
            {
              role: 'tree',
              ...rest,
              id: rootId,
              className: classnames_default()(
                StudioTreeViewRoot_StudioTreeViewRoot_module.list,
                className,
              ),
            },
            children,
          ),
        );
      };
      StudioTreeViewRoot.__docgenInfo = {
        description: '',
        methods: [],
        displayName: 'StudioTreeViewRoot',
        props: {
          onSelect: {
            required: !1,
            tsType: {
              name: 'signature',
              type: 'function',
              raw: '(nodeId: string) => void',
              signature: {
                arguments: [{ type: { name: 'string' }, name: 'nodeId' }],
                return: { name: 'void' },
              },
            },
            description: '',
          },
          selectedId: { required: !1, tsType: { name: 'string' }, description: '' },
        },
      };
      const StudioTreeViewRootContext = (0, react.createContext)(null);
      var StudioAnimateHeight = __webpack_require__(
        './src/components/StudioAnimateHeight/index.ts',
      );
      const StudioTreeViewItemContext = (0, react.createContext)({ level: 1 });
      var src = __webpack_require__('../studio-icons/src/index.ts'),
        StudioButton = __webpack_require__('./src/components/StudioButton/index.ts'),
        StudioTreeViewItem_module = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioTreeView/StudioTreeViewItem/StudioTreeViewItem.module.css',
        ),
        StudioTreeViewItem_module_options = {};
      (StudioTreeViewItem_module_options.styleTagTransform = styleTagTransform_default()),
        (StudioTreeViewItem_module_options.setAttributes =
          setAttributesWithoutAttributes_default()),
        (StudioTreeViewItem_module_options.insert = insertBySelector_default().bind(null, 'head')),
        (StudioTreeViewItem_module_options.domAPI = styleDomAPI_default()),
        (StudioTreeViewItem_module_options.insertStyleElement = insertStyleElement_default());
      injectStylesIntoStyleTag_default()(
        StudioTreeViewItem_module.A,
        StudioTreeViewItem_module_options,
      );
      const StudioTreeViewItem_StudioTreeViewItem_module =
          StudioTreeViewItem_module.A && StudioTreeViewItem_module.A.locals
            ? StudioTreeViewItem_module.A.locals
            : void 0,
        useTreeViewItemOpenOnHierarchySelect = (rootId, nodeId, selectedId, setOpen) => {
          (0, react.useEffect)(() => {
            (nodeId === selectedId ||
              ((childId, rootId, parentId) =>
                findDirectChildIds(rootId, parentId).includes(childId))(
                selectedId,
                rootId,
                nodeId,
              )) &&
              setOpen(!0);
          }, [nodeId, rootId, selectedId, setOpen]);
        },
        StudioTreeViewItem = ({
          as = 'li',
          className,
          children,
          icon,
          label,
          labelWrapper = (lab) => lab,
          nodeId,
          ...rest
        }) => {
          const [open, setOpen] = (0, react.useState)(!1),
            { selectedId, setSelectedId, rootId, focusedId, setFocusedId, focusableId } = (() => {
              const context = (0, react.useContext)(StudioTreeViewRootContext);
              if (!context)
                throw new Error(
                  'useTreeViewRootContext must be used within the TreeViewRoot component.',
                );
              return context;
            })(),
            { level } = (0, react.useContext)(StudioTreeViewItemContext),
            treeItemRef = (0, react.useRef)(null);
          useTreeViewItemOpenOnHierarchySelect(rootId, nodeId, selectedId, setOpen),
            (0, react.useEffect)(() => {
              focusedId === nodeId && treeItemRef.current?.focus();
            }, [focusedId, nodeId]);
          const selected = selectedId === nodeId,
            focusable = focusableId === nodeId,
            selectNode = () => {
              setOpen((prevOpen) => !prevOpen), setSelectedId(nodeId);
            },
            handleKeyDown = (event) => {
              switch (event.key) {
                case 'ArrowRight':
                  children &&
                    (open
                      ? setFocusedId(
                          ((rootId, nodeId) => findDirectChildIds(rootId, nodeId)[0] || null)(
                            rootId,
                            nodeId,
                          ),
                        )
                      : setOpen(!0));
                  break;
                case 'ArrowLeft':
                  open ? setOpen(!1) : setFocusedId(findParentId(rootId, nodeId));
                  break;
                case 'ArrowDown':
                  const nextVisibleNode = ((rootId, nodeId) => {
                    const visibleNodeIds = findAllVisibleNodeIds(rootId),
                      index = visibleNodeIds.indexOf(nodeId);
                    return visibleNodeIds[index + 1] || null;
                  })(rootId, nodeId);
                  nextVisibleNode && setFocusedId(nextVisibleNode);
                  break;
                case 'ArrowUp':
                  const previousVisibleNode = ((rootId, nodeId) => {
                    const visibleNodeIds = findAllVisibleNodeIds(rootId),
                      index = visibleNodeIds.indexOf(nodeId);
                    return visibleNodeIds[index - 1] || null;
                  })(rootId, nodeId);
                  previousVisibleNode && setFocusedId(previousVisibleNode);
                  break;
                case 'Home':
                  setFocusedId(findFirstNodeId(rootId));
                  break;
                case 'End':
                  setFocusedId(
                    ((rootId) => {
                      const visibleNodeIds = findAllVisibleNodeIds(rootId);
                      return visibleNodeIds[visibleNodeIds.length - 1] || null;
                    })(rootId),
                  );
                  break;
                case 'Enter':
                  selectNode();
              }
            },
            handleFocus = () => setFocusedId(nodeId),
            treeItemId = makeDomTreeItemId(rootId, nodeId),
            listId = makeDomGroupId(rootId, nodeId),
            hasChildren = !!children,
            Component = as;
          return react.createElement(
            StudioTreeViewItemContext.Provider,
            { value: { level: level + 1 } },
            react.createElement(
              Component,
              {
                role: 'none',
                ...rest,
                className: classnames_default()(
                  StudioTreeViewItem_StudioTreeViewItem_module.listItem,
                  className,
                ),
              },
              labelWrapper(
                react.createElement(
                  StudioButton.r,
                  {
                    'aria-expanded': children ? open : void 0,
                    'aria-level': level,
                    'aria-owns': listId,
                    'aria-selected': selected,
                    className: StudioTreeViewItem_StudioTreeViewItem_module.button,
                    color: 'first',
                    icon: react.createElement(Icon, { customIcon: icon, hasChildren, open }),
                    id: treeItemId,
                    onClick: selectNode,
                    onFocus: handleFocus,
                    onKeyDown: handleKeyDown,
                    ref: treeItemRef,
                    role: 'treeitem',
                    tabIndex: focusable ? 0 : -1,
                    type: 'button',
                    variant: 'tertiary',
                    asChild: !0,
                  },
                  react.createElement(
                    'div',
                    { className: StudioTreeViewItem_StudioTreeViewItem_module.label },
                    label,
                  ),
                ),
              ),
              hasChildren &&
                react.createElement(
                  StudioAnimateHeight.H,
                  { open },
                  react.createElement(
                    'ul',
                    {
                      role: 'group',
                      id: listId,
                      'aria-hidden': !open,
                      className: StudioTreeViewItem_StudioTreeViewItem_module.childItemList,
                    },
                    children,
                  ),
                ),
            ),
          );
        },
        Icon = ({ customIcon, hasChildren, open }) =>
          customIcon ||
          (hasChildren
            ? open
              ? react.createElement(src.ChevronDownIcon, null)
              : react.createElement(src.ChevronRightIcon, null)
            : null);
      StudioTreeViewItem.__docgenInfo = {
        description: '',
        methods: [],
        displayName: 'StudioTreeViewItem',
        props: {
          as: {
            required: !1,
            tsType: { name: 'ElementType' },
            description: '',
            defaultValue: { value: "'li'", computed: !1 },
          },
          children: { required: !1, tsType: { name: 'ReactNode' }, description: '' },
          className: { required: !1, tsType: { name: 'string' }, description: '' },
          icon: { required: !1, tsType: { name: 'ReactNode' }, description: '' },
          label: { required: !0, tsType: { name: 'ReactNode' }, description: '' },
          labelWrapper: {
            required: !1,
            tsType: {
              name: 'signature',
              type: 'function',
              raw: '(children: ReactNode) => ReactNode',
              signature: {
                arguments: [{ type: { name: 'ReactNode' }, name: 'children' }],
                return: { name: 'ReactNode' },
              },
            },
            description: '',
            defaultValue: { value: '(lab) => lab', computed: !1 },
          },
          nodeId: { required: !0, tsType: { name: 'string' }, description: '' },
        },
      };
      const StudioTreeView = { Root: StudioTreeViewRoot, Item: StudioTreeViewItem };
    },
    './src/hooks/index.ts': (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
      __webpack_require__.d(__webpack_exports__, {
        Ub: () => useMediaQuery,
        ZC: () => usePrevious,
        oM: () => useRetainWhileLoading,
      });
      var react = __webpack_require__('../../../node_modules/react/index.js');
      function useMediaQuery(query) {
        const getMatches = (query) => window?.matchMedia(query).matches ?? !1,
          [matches, setMatches] = (0, react.useState)(getMatches(query)),
          eventListener = () => {
            setMatches(getMatches(query));
          };
        return (
          (0, react.useEffect)(() => {
            const matchMedia = window.matchMedia(query);
            return (
              eventListener(),
              matchMedia.addEventListener('change', eventListener),
              () => matchMedia.removeEventListener('change', eventListener)
            );
          }, [query]),
          matches
        );
      }
      function usePrevious(value) {
        const ref = (0, react.useRef)();
        return (
          (0, react.useEffect)(() => {
            ref.current = value;
          }, [value]),
          ref.current
        );
      }
      const useRetainWhileLoading = (isLoading, value) => {
        const previousValue = usePrevious(value);
        return isLoading ? previousValue : value;
      };
      __webpack_require__('./src/hooks/useLocalStorage.ts'),
        __webpack_require__('./src/hooks/webStorage.ts');
    },
    './src/hooks/useLocalStorage.ts': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { M: () => useLocalStorage });
      var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        ),
        _webStorage__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__('./src/hooks/webStorage.ts');
      const useLocalStorage = (key, initialValue) =>
        ((typedStorage, key, initialValue) => {
          const [value, setValue] = (0, react__WEBPACK_IMPORTED_MODULE_0__.useState)(
            () => typedStorage.getItem(key) || initialValue,
          );
          return [
            value,
            (0, react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(
              (newValue) => {
                typedStorage.setItem(key, newValue), setValue(newValue);
              },
              [key, typedStorage],
            ),
            (0, react__WEBPACK_IMPORTED_MODULE_0__.useCallback)(() => {
              typedStorage.removeItem(key), setValue(void 0);
            }, [key, typedStorage]),
          ];
        })(_webStorage__WEBPACK_IMPORTED_MODULE_1__.t, key, initialValue);
    },
    './src/hooks/webStorage.ts': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { t: () => typedLocalStorage });
      const createWebStorage = (storage) => {
          storage ||
            console.warn(
              'Storage API not available. The browser might not support the provided storage.',
            );
          const removeItem = (key) => storage.removeItem(key);
          return {
            setItem: (key, value) => {
              void 0 !== value && storage.setItem(key, JSON.stringify(value));
            },
            getItem: (key) => {
              const storedItem = storage.getItem(key);
              if (storedItem)
                try {
                  return JSON.parse(storedItem);
                } catch (error) {
                  console.warn(
                    `Failed to parse stored item with key ${key}. Ensure that the item is a valid JSON string. Error: ${error}`,
                  ),
                    removeItem(key);
                }
            },
            removeItem,
          };
        },
        typedLocalStorage = createWebStorage(window?.localStorage);
      createWebStorage(window?.sessionStorage);
    },
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioAnimateHeight/StudioAnimateHeight.module.css':
      (module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, { A: () => __WEBPACK_DEFAULT_EXPORT__ });
        var _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ =
            __webpack_require__(
              '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/runtime/sourceMaps.js',
            ),
          _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default =
            __webpack_require__.n(
              _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__,
            ),
          _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ =
            __webpack_require__(
              '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/runtime/api.js',
            ),
          ___CSS_LOADER_EXPORT___ = __webpack_require__.n(
            _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__,
          )()(
            _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default(),
          );
        ___CSS_LOADER_EXPORT___.push([
          module.id,
          '.EXfJOgtex0nEP6dcf7YA.SURJWQBy2zmAMwSUFd56,\n.EXfJOgtex0nEP6dcf7YA.J7L0zUXGNueedULqGlmc {\n  overflow: hidden;\n}\n\n.EXfJOgtex0nEP6dcf7YA.PDbteKiBOktdK8WnRN17 .yBekW6qgnUQUbEOWMQDR {\n  height: auto;\n}\n\n.EXfJOgtex0nEP6dcf7YA.J7L0zUXGNueedULqGlmc .yBekW6qgnUQUbEOWMQDR {\n  height: 0;\n}\n',
          '',
          {
            version: 3,
            sources: [
              'webpack://./src/components/StudioAnimateHeight/StudioAnimateHeight.module.css',
            ],
            names: [],
            mappings: 'AAAA;;EAEE,gBAAgB;AAClB;;AAEA;EACE,YAAY;AACd;;AAEA;EACE,SAAS;AACX',
            sourcesContent: [
              '.root.openingOrClosing,\n.root.closed {\n  overflow: hidden;\n}\n\n.root.open .content {\n  height: auto;\n}\n\n.root.closed .content {\n  height: 0;\n}\n',
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = {
            root: 'EXfJOgtex0nEP6dcf7YA',
            openingOrClosing: 'SURJWQBy2zmAMwSUFd56',
            closed: 'J7L0zUXGNueedULqGlmc',
            open: 'PDbteKiBOktdK8WnRN17',
            content: 'yBekW6qgnUQUbEOWMQDR',
          });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioButton/StudioButton.module.css':
      (module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, { A: () => __WEBPACK_DEFAULT_EXPORT__ });
        var _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ =
            __webpack_require__(
              '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/runtime/sourceMaps.js',
            ),
          _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default =
            __webpack_require__.n(
              _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__,
            ),
          _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ =
            __webpack_require__(
              '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/runtime/api.js',
            ),
          ___CSS_LOADER_EXPORT___ = __webpack_require__.n(
            _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__,
          )()(
            _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default(),
          );
        ___CSS_LOADER_EXPORT___.push([
          module.id,
          '.VsljBaht8yIHfQNncszf {\n  display: inline-flex;\n  gap: var(--fds-spacing-1);\n}\n\n.pLTIwGuCRUzQbPzUljBE {\n  display: flex;\n  align-items: center;\n  gap: var(--fds-spacing-2);\n}\n\n.nohkVRNOJdkmSdRVeuOQ {\n  display: contents;\n}\n\n.xfxnTjsHc_MM1EarWiUH {\n  color: var(--fds-semantic-text-neutral-on_inverted);\n  background: transparent;\n}\n\n.xfxnTjsHc_MM1EarWiUH:hover {\n  background: var(--fds-semantic-surface-on_inverted-no_fill-hover);\n}\n\n.bJsmp0K5zJOZVdUgNX9V {\n  min-height: var(--fds-sizing-8);\n}\n',
          '',
          {
            version: 3,
            sources: ['webpack://./src/components/StudioButton/StudioButton.module.css'],
            names: [],
            mappings:
              'AAAA;EACE,oBAAoB;EACpB,yBAAyB;AAC3B;;AAEA;EACE,aAAa;EACb,mBAAmB;EACnB,yBAAyB;AAC3B;;AAEA;EACE,iBAAiB;AACnB;;AAEA;EACE,mDAAmD;EACnD,uBAAuB;AACzB;;AAEA;EACE,iEAAiE;AACnE;;AAEA;EACE,+BAA+B;AACjC',
            sourcesContent: [
              '.studioButton {\n  display: inline-flex;\n  gap: var(--fds-spacing-1);\n}\n\n.innerContainer {\n  display: flex;\n  align-items: center;\n  gap: var(--fds-spacing-2);\n}\n\n.iconWrapper {\n  display: contents;\n}\n\n.inverted {\n  color: var(--fds-semantic-text-neutral-on_inverted);\n  background: transparent;\n}\n\n.inverted:hover {\n  background: var(--fds-semantic-surface-on_inverted-no_fill-hover);\n}\n\n.small {\n  min-height: var(--fds-sizing-8);\n}\n',
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = {
            studioButton: 'VsljBaht8yIHfQNncszf',
            innerContainer: 'pLTIwGuCRUzQbPzUljBE',
            iconWrapper: 'nohkVRNOJdkmSdRVeuOQ',
            inverted: 'xfxnTjsHc_MM1EarWiUH',
            small: 'bJsmp0K5zJOZVdUgNX9V',
          });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioTreeView/StudioTreeViewItem/StudioTreeViewItem.module.css':
      (module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, { A: () => __WEBPACK_DEFAULT_EXPORT__ });
        var _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ =
            __webpack_require__(
              '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/runtime/sourceMaps.js',
            ),
          _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default =
            __webpack_require__.n(
              _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__,
            ),
          _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ =
            __webpack_require__(
              '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/runtime/api.js',
            ),
          ___CSS_LOADER_EXPORT___ = __webpack_require__.n(
            _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__,
          )()(
            _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default(),
          );
        ___CSS_LOADER_EXPORT___.push([
          module.id,
          ".stNN4YoBF_pqY7j9Ur8i {\n  list-style-type: none;\n  margin: 0;\n  padding: 0;\n}\n\n.F2saZQ7v3KRV0nLFIqOH {\n  align-items: center;\n  border-radius: 0;\n  border-width: 0 0 0 var(--studio-treeitem-vertical-line-width);\n  color: var(--fds-semantic-text-neutral-default);\n  justify-content: left;\n  width: 100%;\n}\n\n.F2saZQ7v3KRV0nLFIqOH[aria-selected='true'] {\n  background-color: var(--studio-treeitem-selected-background-colour);\n  border-color: var(--studio-treeitem-vertical-line-colour-root);\n}\n\n.stNN4YoBF_pqY7j9Ur8i .stNN4YoBF_pqY7j9Ur8i .F2saZQ7v3KRV0nLFIqOH:not([aria-selected='true']) {\n  /* This should not apply to the top level, hence the nested .listItem selector */\n  border-color: var(--studio-treeitem-vertical-line-colour);\n}\n\n.F2saZQ7v3KRV0nLFIqOH:focus {\n  z-index: 1;\n}\n\n.i85jO7Mn27emJZ6I2cOu {\n  --icon-width: 1em;\n  --icon-left-spacing: calc(var(--studio-treeitem-vertical-line-width) + var(--fds-spacing-3));\n  --vertical-line-center: calc(var(--icon-left-spacing) + var(--icon-width) / 2);\n  --vertical-line-left-spacing: calc(\n    var(--vertical-line-center) - var(--studio-treeitem-vertical-line-width) / 2\n  );\n\n  padding-left: 0;\n  margin-left: var(--vertical-line-left-spacing);\n  box-shadow: var(--studio-treeitem-vertical-line-colour) var(--studio-treeitem-vertical-line-width)\n    0 inset;\n}\n\n.mHgAkDmYPA62cJyz9kIm {\n  overflow: hidden;\n  white-space: nowrap;\n  text-overflow: ellipsis;\n}\n",
          '',
          {
            version: 3,
            sources: [
              'webpack://./src/components/StudioTreeView/StudioTreeViewItem/StudioTreeViewItem.module.css',
            ],
            names: [],
            mappings:
              'AAAA;EACE,qBAAqB;EACrB,SAAS;EACT,UAAU;AACZ;;AAEA;EACE,mBAAmB;EACnB,gBAAgB;EAChB,8DAA8D;EAC9D,+CAA+C;EAC/C,qBAAqB;EACrB,WAAW;AACb;;AAEA;EACE,mEAAmE;EACnE,8DAA8D;AAChE;;AAEA;EACE,gFAAgF;EAChF,yDAAyD;AAC3D;;AAEA;EACE,UAAU;AACZ;;AAEA;EACE,iBAAiB;EACjB,4FAA4F;EAC5F,8EAA8E;EAC9E;;GAEC;;EAED,eAAe;EACf,8CAA8C;EAC9C;WACS;AACX;;AAEA;EACE,gBAAgB;EAChB,mBAAmB;EACnB,uBAAuB;AACzB',
            sourcesContent: [
              ".listItem {\n  list-style-type: none;\n  margin: 0;\n  padding: 0;\n}\n\n.button {\n  align-items: center;\n  border-radius: 0;\n  border-width: 0 0 0 var(--studio-treeitem-vertical-line-width);\n  color: var(--fds-semantic-text-neutral-default);\n  justify-content: left;\n  width: 100%;\n}\n\n.button[aria-selected='true'] {\n  background-color: var(--studio-treeitem-selected-background-colour);\n  border-color: var(--studio-treeitem-vertical-line-colour-root);\n}\n\n.listItem .listItem .button:not([aria-selected='true']) {\n  /* This should not apply to the top level, hence the nested .listItem selector */\n  border-color: var(--studio-treeitem-vertical-line-colour);\n}\n\n.button:focus {\n  z-index: 1;\n}\n\n.childItemList {\n  --icon-width: 1em;\n  --icon-left-spacing: calc(var(--studio-treeitem-vertical-line-width) + var(--fds-spacing-3));\n  --vertical-line-center: calc(var(--icon-left-spacing) + var(--icon-width) / 2);\n  --vertical-line-left-spacing: calc(\n    var(--vertical-line-center) - var(--studio-treeitem-vertical-line-width) / 2\n  );\n\n  padding-left: 0;\n  margin-left: var(--vertical-line-left-spacing);\n  box-shadow: var(--studio-treeitem-vertical-line-colour) var(--studio-treeitem-vertical-line-width)\n    0 inset;\n}\n\n.label {\n  overflow: hidden;\n  white-space: nowrap;\n  text-overflow: ellipsis;\n}\n",
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = {
            listItem: 'stNN4YoBF_pqY7j9Ur8i',
            button: 'F2saZQ7v3KRV0nLFIqOH',
            childItemList: 'i85jO7Mn27emJZ6I2cOu',
            label: 'mHgAkDmYPA62cJyz9kIm',
          });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioTreeView/StudioTreeViewRoot/StudioTreeViewRoot.module.css':
      (module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, { A: () => __WEBPACK_DEFAULT_EXPORT__ });
        var _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ =
            __webpack_require__(
              '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/runtime/sourceMaps.js',
            ),
          _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default =
            __webpack_require__.n(
              _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__,
            ),
          _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ =
            __webpack_require__(
              '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/runtime/api.js',
            ),
          ___CSS_LOADER_EXPORT___ = __webpack_require__.n(
            _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__,
          )()(
            _node_modules_storybook_builder_webpack5_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default(),
          );
        ___CSS_LOADER_EXPORT___.push([
          module.id,
          '.FALlvTekFzLdtgPHKFvW {\n  list-style-type: none;\n  margin: 0;\n  padding: 0;\n}\n',
          '',
          {
            version: 3,
            sources: [
              'webpack://./src/components/StudioTreeView/StudioTreeViewRoot/StudioTreeViewRoot.module.css',
            ],
            names: [],
            mappings: 'AAAA;EACE,qBAAqB;EACrB,SAAS;EACT,UAAU;AACZ',
            sourcesContent: ['.list {\n  list-style-type: none;\n  margin: 0;\n  padding: 0;\n}\n'],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = { list: 'FALlvTekFzLdtgPHKFvW' });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
  },
]);
