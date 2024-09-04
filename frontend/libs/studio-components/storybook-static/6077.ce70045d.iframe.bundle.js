'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [6077],
  {
    './src/components/StudioResizableLayout/StudioResizableLayoutContainer/StudioResizableLayoutContainer.tsx':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, { HV: () => StudioResizableLayoutContainer });
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
          StudioResizableLayoutContainer_module = __webpack_require__(
            '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioResizableLayout/StudioResizableLayoutContainer/StudioResizableLayoutContainer.module.css',
          ),
          options = {};
        (options.styleTagTransform = styleTagTransform_default()),
          (options.setAttributes = setAttributesWithoutAttributes_default()),
          (options.insert = insertBySelector_default().bind(null, 'head')),
          (options.domAPI = styleDomAPI_default()),
          (options.insertStyleElement = insertStyleElement_default());
        injectStylesIntoStyleTag_default()(StudioResizableLayoutContainer_module.A, options);
        const StudioResizableLayoutContainer_StudioResizableLayoutContainer_module =
          StudioResizableLayoutContainer_module.A && StudioResizableLayoutContainer_module.A.locals
            ? StudioResizableLayoutContainer_module.A.locals
            : void 0;
        class StudioResizableLayoutArea {
          index;
          HTMLElementRef;
          reactElement;
          orientation;
          constructor(index, HTMLElementRef, reactElement, orientation) {
            (this.index = index),
              (this.HTMLElementRef = HTMLElementRef),
              (this.reactElement = reactElement),
              (this.orientation = orientation);
          }
          get size() {
            return 'vertical' === this.orientation
              ? this.HTMLElementRef.offsetHeight
              : this.HTMLElementRef.offsetWidth;
          }
          get flexGrow() {
            return parseFloat(this.HTMLElementRef.style.flexGrow || '1');
          }
          get minimumSize() {
            return this.reactElement.props.minimumSize || 0;
          }
          get maximumSize() {
            return this.reactElement.props.maximumSize || Number.MAX_SAFE_INTEGER;
          }
          get collapsedSize() {
            return this.reactElement.props.collapsedSize || 0;
          }
          get collapsed() {
            return this.reactElement.props.collapsed;
          }
        }
        const useStudioResizableLayoutFunctions = (
          orientation,
          elementRefs,
          children,
          setContainerSize,
        ) => {
          const getElement = (index) =>
              new StudioResizableLayoutArea(
                index,
                elementRefs.current[index],
                children[index],
                orientation,
              ),
            resizeTo = (index, size) => {
              const element = getElement(index),
                neighbour = ((index) => {
                  const neighbourIndex =
                    elementRefs.current.length < index + 2 ? index - 1 : index + 1;
                  return getElement(neighbourIndex);
                })(index);
              if (element.collapsed || neighbour.collapsed) return;
              const { containerFlexGrow, neighbourFlexGrow } = ((
                element,
                neighbour,
                resizeTo,
                ignoreMinimumSize = !1,
              ) => {
                const totalPixelSize = element.size + neighbour.size,
                  { newSize, neighbourNewSize } = ignoreMinimumSize
                    ? { newSize: resizeTo, neighbourNewSize: totalPixelSize - resizeTo }
                    : ((element, neighbour, newSize) => {
                        const totalSize = element.size + neighbour.size;
                        return (
                          element.maximumSize < newSize && (newSize = element.maximumSize),
                          element.minimumSize > newSize && (newSize = element.minimumSize),
                          neighbour.minimumSize > totalSize - newSize &&
                            (newSize = totalSize - neighbour.minimumSize),
                          { newSize, neighbourNewSize: totalSize - newSize }
                        );
                      })(element, neighbour, resizeTo),
                  totalFlexGrow = element.flexGrow + neighbour.flexGrow;
                return {
                  containerFlexGrow: (newSize / totalPixelSize) * totalFlexGrow,
                  neighbourFlexGrow: (neighbourNewSize / totalPixelSize) * totalFlexGrow,
                };
              })(element, neighbour, size);
              setContainerSize(index, containerFlexGrow),
                setContainerSize(neighbour.index, neighbourFlexGrow);
            };
          return {
            resizeTo,
            resizeDelta: (index, size) => {
              const element = getElement(index);
              resizeTo(index, element.size + size);
            },
          };
        };
        var useLocalStorage = __webpack_require__('./src/hooks/useLocalStorage.ts');
        var StudioResizableLayoutContext = __webpack_require__(
          './src/components/StudioResizableLayout/context/StudioResizableLayoutContext.ts',
        );
        const StudioResizableLayoutContainer = ({
            children,
            orientation,
            localStorageContext = 'default',
            style,
          }) => {
            const elementRefs = (0, react.useRef)([]);
            (0, react.useEffect)(() => {
              elementRefs.current = elementRefs.current.slice(0, getValidChildren(children).length);
            }, [children]);
            const { containerSizes, setContainerSizes } = ((localStorageContextKey) => {
                const [containerSizes, setContainerSizes] = (0, react.useState)([]),
                  [value, setValue] = (0, useLocalStorage.M)(
                    `studio:resizable-layout:${localStorageContextKey}`,
                    containerSizes,
                  );
                return (
                  (0, react.useMemo)(() => {
                    setContainerSizes(value);
                  }, []),
                  (0, react.useEffect)(() => {
                    setValue(containerSizes);
                  }, [containerSizes, setValue]),
                  { containerSizes, setContainerSizes }
                );
              })(localStorageContext),
              { resizeTo, resizeDelta } = useStudioResizableLayoutFunctions(
                orientation,
                elementRefs,
                getValidChildren(children),
                (index, size) => setContainerSizes((prev) => ({ ...prev, [index]: size })),
              );
            return react.createElement(
              StudioResizableLayoutContext.$.Provider,
              { value: { resizeDelta, resizeTo, orientation, containerSizes } },
              react.createElement(
                'div',
                {
                  className:
                    StudioResizableLayoutContainer_StudioResizableLayoutContainer_module.root,
                  style: {
                    ...style,
                    flexDirection: 'horizontal' === orientation ? 'row' : 'column',
                  },
                },
                react.Children.map(getValidChildren(children), (child, index) => {
                  const hasNeighbour = index < getValidChildren(children).length - 1;
                  return react.cloneElement(child, {
                    index,
                    hasNeighbour,
                    ref: (element) => (elementRefs.current[index] = element),
                  });
                }),
              ),
            );
          },
          getValidChildren = (children) => children.filter((child) => !!child);
        (StudioResizableLayoutContainer.displayName = 'StudioResizableLayout.Container'),
          (StudioResizableLayoutContainer.__docgenInfo = {
            description: '',
            methods: [],
            displayName: 'StudioResizableLayout.Container',
            props: {
              localStorageContext: {
                required: !1,
                tsType: { name: 'string' },
                description: '',
                defaultValue: { value: "'default'", computed: !1 },
              },
              orientation: {
                required: !0,
                tsType: { name: 'unknown[number]', raw: '(typeof ORIENTATIONS)[number]' },
                description: '',
              },
              style: { required: !1, tsType: { name: 'CSSProperties' }, description: '' },
              children: {
                required: !0,
                tsType: {
                  name: 'Array',
                  elements: [
                    {
                      name: 'ReactElement',
                      elements: [
                        {
                          name: 'signature',
                          type: 'object',
                          raw: '{\n  minimumSize?: number;\n  maximumSize?: number;\n  collapsedSize?: number;\n  collapsed?: boolean;\n  style?: React.CSSProperties;\n\n  onResizing?: (resizing: boolean) => void;\n\n  //** supplied from container **//\n  resize?: (size: number) => void;\n  hasNeighbour?: boolean;\n  index?: number;\n  children: React.ReactElement | React.ReactElement[];\n  ref?: React.Ref<HTMLDivElement>;\n}',
                          signature: {
                            properties: [
                              { key: 'minimumSize', value: { name: 'number', required: !1 } },
                              { key: 'maximumSize', value: { name: 'number', required: !1 } },
                              { key: 'collapsedSize', value: { name: 'number', required: !1 } },
                              { key: 'collapsed', value: { name: 'boolean', required: !1 } },
                              {
                                key: 'style',
                                value: {
                                  name: 'ReactCSSProperties',
                                  raw: 'React.CSSProperties',
                                  required: !1,
                                },
                              },
                              {
                                key: 'onResizing',
                                value: {
                                  name: 'signature',
                                  type: 'function',
                                  raw: '(resizing: boolean) => void',
                                  signature: {
                                    arguments: [{ type: { name: 'boolean' }, name: 'resizing' }],
                                    return: { name: 'void' },
                                  },
                                  required: !1,
                                },
                              },
                              {
                                key: 'resize',
                                value: {
                                  name: 'signature',
                                  type: 'function',
                                  raw: '(size: number) => void',
                                  signature: {
                                    arguments: [{ type: { name: 'number' }, name: 'size' }],
                                    return: { name: 'void' },
                                  },
                                  required: !1,
                                },
                              },
                              { key: 'hasNeighbour', value: { name: 'boolean', required: !1 } },
                              { key: 'index', value: { name: 'number', required: !1 } },
                              {
                                key: 'children',
                                value: {
                                  name: 'union',
                                  raw: 'React.ReactElement | React.ReactElement[]',
                                  elements: [
                                    { name: 'ReactReactElement', raw: 'React.ReactElement' },
                                    {
                                      name: 'Array',
                                      elements: [
                                        { name: 'ReactReactElement', raw: 'React.ReactElement' },
                                      ],
                                      raw: 'React.ReactElement[]',
                                    },
                                  ],
                                  required: !0,
                                },
                              },
                              {
                                key: 'ref',
                                value: {
                                  name: 'ReactRef',
                                  raw: 'React.Ref<HTMLDivElement>',
                                  elements: [{ name: 'HTMLDivElement' }],
                                  required: !1,
                                },
                              },
                            ],
                          },
                        },
                      ],
                      raw: 'ReactElement<StudioResizableLayoutElementProps>',
                    },
                  ],
                  raw: 'ReactElement<StudioResizableLayoutElementProps>[]',
                },
                description: '',
              },
            },
          });
      },
    './src/components/StudioResizableLayout/StudioResizableLayoutElement/StudioResizableLayoutElement.tsx':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.d(__webpack_exports__, { A: () => StudioResizableLayoutElement });
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
          StudioResizableLayoutElement_module = __webpack_require__(
            '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioResizableLayout/StudioResizableLayoutElement/StudioResizableLayoutElement.module.css',
          ),
          options = {};
        (options.styleTagTransform = styleTagTransform_default()),
          (options.setAttributes = setAttributesWithoutAttributes_default()),
          (options.insert = insertBySelector_default().bind(null, 'head')),
          (options.domAPI = styleDomAPI_default()),
          (options.insertStyleElement = insertStyleElement_default());
        injectStylesIntoStyleTag_default()(StudioResizableLayoutElement_module.A, options);
        const StudioResizableLayoutElement_StudioResizableLayoutElement_module =
          StudioResizableLayoutElement_module.A && StudioResizableLayoutElement_module.A.locals
            ? StudioResizableLayoutElement_module.A.locals
            : void 0;
        var StudioResizableLayoutContext = __webpack_require__(
          './src/components/StudioResizableLayout/context/StudioResizableLayoutContext.ts',
        );
        const useStudioResizableLayoutContext = (index) => {
          const { containerSizes, orientation, resizeDelta, resizeTo } = (0, react.useContext)(
            StudioResizableLayoutContext.$,
          );
          return { containerSize: containerSizes[index], orientation, resizeDelta, resizeTo };
        };
        var StudioResizableLayoutHandle_module = __webpack_require__(
            '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioResizableLayout/StudioResizableLayoutHandle/StudioResizableLayoutHandle.module.css',
          ),
          StudioResizableLayoutHandle_module_options = {};
        (StudioResizableLayoutHandle_module_options.styleTagTransform =
          styleTagTransform_default()),
          (StudioResizableLayoutHandle_module_options.setAttributes =
            setAttributesWithoutAttributes_default()),
          (StudioResizableLayoutHandle_module_options.insert = insertBySelector_default().bind(
            null,
            'head',
          )),
          (StudioResizableLayoutHandle_module_options.domAPI = styleDomAPI_default()),
          (StudioResizableLayoutHandle_module_options.insertStyleElement =
            insertStyleElement_default());
        injectStylesIntoStyleTag_default()(
          StudioResizableLayoutHandle_module.A,
          StudioResizableLayoutHandle_module_options,
        );
        const StudioResizableLayoutHandle_StudioResizableLayoutHandle_module =
            StudioResizableLayoutHandle_module.A && StudioResizableLayoutHandle_module.A.locals
              ? StudioResizableLayoutHandle_module.A.locals
              : void 0,
          StudioResizableLayoutHandle = ({ orientation, index, onResizing }) => {
            const { resizeDelta, containerSize } = useStudioResizableLayoutContext(index),
              { onMouseDown, isResizing } = ((orientation, onMousePosChange) => {
                const lastMousePosition = (0, react.useRef)(0),
                  [isResizing, setIsResizing] = (0, react.useState)(!1),
                  update = (0, react.useRef)(1),
                  lastEventUpdate = (0, react.useRef)(0);
                (0, react.useEffect)(() => {
                  update.current++;
                });
                const mouseMove = (0, react.useCallback)(
                    (event) => {
                      if (update.current === lastEventUpdate.current) return;
                      lastEventUpdate.current = update.current;
                      const mousePos = 'horizontal' === orientation ? event.clientX : event.clientY,
                        mouseDelta = mousePos - lastMousePosition.current;
                      onMousePosChange(mouseDelta), (lastMousePosition.current = mousePos);
                    },
                    [orientation, onMousePosChange],
                  ),
                  mouseUp = (0, react.useCallback)(
                    (_) => {
                      (update.current = 1),
                        (lastEventUpdate.current = 0),
                        setIsResizing(!1),
                        window.removeEventListener('mousemove', mouseMove),
                        window.removeEventListener('mouseup', mouseUp);
                    },
                    [mouseMove],
                  );
                return {
                  onMouseDown: (0, react.useCallback)(
                    (event) => {
                      0 === event.button &&
                        (event.preventDefault(),
                        setIsResizing(!0),
                        (lastMousePosition.current =
                          'horizontal' === orientation ? event.clientX : event.clientY),
                        window.addEventListener('mousemove', mouseMove),
                        window.addEventListener('mouseup', mouseUp));
                    },
                    [mouseMove, mouseUp, orientation],
                  ),
                  isResizing,
                };
              })(orientation, (delta) => {
                resizeDelta(index, delta);
              }),
              { onKeyDown } =
                ((onResize = (delta) => resizeDelta(index, delta)),
                {
                  onKeyDown: (event) => {
                    'ArrowLeft' === event.key || 'ArrowUp' === event.key
                      ? event.shiftKey
                        ? onResize(-50)
                        : onResize(-10)
                      : ('ArrowRight' !== event.key && 'ArrowDown' !== event.key) ||
                        (event.shiftKey ? onResize(50) : onResize(10));
                  },
                });
            var onResize;
            return (
              (0, react.useEffect)(() => {
                onResizing?.(isResizing);
              }, [isResizing, onResizing]),
              react.createElement('div', {
                role: 'separator',
                tabIndex: 0,
                className: `${StudioResizableLayoutHandle_StudioResizableLayoutHandle_module.resizeHandle}\n                  ${'horizontal' === orientation ? StudioResizableLayoutHandle_StudioResizableLayoutHandle_module.resizeHandleH : StudioResizableLayoutHandle_StudioResizableLayoutHandle_module.resizeHandleV}\n                  ${containerSize < 0.05 ? StudioResizableLayoutHandle_StudioResizableLayoutHandle_module.hideLeftSide : ''}`,
                onMouseDown,
                onKeyDown,
                style: { backgroundColor: isResizing ? 'gray' : 'darkgray' },
              })
            );
          };
        StudioResizableLayoutHandle.__docgenInfo = {
          description: '',
          methods: [],
          displayName: 'StudioResizableLayoutHandle',
          props: {
            orientation: {
              required: !0,
              tsType: { name: 'unknown[number]', raw: '(typeof ORIENTATIONS)[number]' },
              description: '',
            },
            index: { required: !0, tsType: { name: 'number' }, description: '' },
            onResizing: {
              required: !1,
              tsType: {
                name: 'signature',
                type: 'function',
                raw: '(resizing: boolean) => void',
                signature: {
                  arguments: [{ type: { name: 'boolean' }, name: 'resizing' }],
                  return: { name: 'void' },
                },
              },
              description: '',
            },
          },
        };
        const StudioResizableLayoutElement = (0, react.forwardRef)(
          (
            {
              index,
              minimumSize = 0,
              maximumSize,
              collapsedSize,
              collapsed,
              children,
              hasNeighbour = !1,
              style,
              onResizing,
            },
            ref,
          ) => {
            const { orientation, containerSize } = useStudioResizableLayoutContext(index);
            return react.createElement(
              react.Fragment,
              null,
              react.createElement(
                'div',
                {
                  'data-testid': 'resizablelayoutelement',
                  className:
                    StudioResizableLayoutElement_StudioResizableLayoutElement_module.container,
                  style: {
                    ...style,
                    flexGrow: containerSize,
                    maxWidth: collapsed ? collapsedSize : maximumSize,
                    minWidth: collapsed ? collapsedSize : minimumSize,
                  },
                  ref,
                },
                children,
              ),
              hasNeighbour &&
                react.createElement(StudioResizableLayoutHandle, {
                  orientation,
                  index,
                  onResizing,
                }),
            );
          },
        );
        (StudioResizableLayoutElement.displayName = 'StudioResizableLayout.Element'),
          (StudioResizableLayoutElement.__docgenInfo = {
            description: '',
            methods: [],
            displayName: 'StudioResizableLayout.Element',
            props: {
              minimumSize: {
                required: !1,
                tsType: { name: 'number' },
                description: '',
                defaultValue: { value: '0', computed: !1 },
              },
              maximumSize: { required: !1, tsType: { name: 'number' }, description: '' },
              collapsedSize: { required: !1, tsType: { name: 'number' }, description: '' },
              collapsed: { required: !1, tsType: { name: 'boolean' }, description: '' },
              style: {
                required: !1,
                tsType: { name: 'ReactCSSProperties', raw: 'React.CSSProperties' },
                description: '',
              },
              onResizing: {
                required: !1,
                tsType: {
                  name: 'signature',
                  type: 'function',
                  raw: '(resizing: boolean) => void',
                  signature: {
                    arguments: [{ type: { name: 'boolean' }, name: 'resizing' }],
                    return: { name: 'void' },
                  },
                },
                description: '',
              },
              resize: {
                required: !1,
                tsType: {
                  name: 'signature',
                  type: 'function',
                  raw: '(size: number) => void',
                  signature: {
                    arguments: [{ type: { name: 'number' }, name: 'size' }],
                    return: { name: 'void' },
                  },
                },
                description: '',
              },
              hasNeighbour: {
                required: !1,
                tsType: { name: 'boolean' },
                description: '',
                defaultValue: { value: 'false', computed: !1 },
              },
              index: { required: !1, tsType: { name: 'number' }, description: '' },
              children: {
                required: !0,
                tsType: {
                  name: 'union',
                  raw: 'React.ReactElement | React.ReactElement[]',
                  elements: [
                    { name: 'ReactReactElement', raw: 'React.ReactElement' },
                    {
                      name: 'Array',
                      elements: [{ name: 'ReactReactElement', raw: 'React.ReactElement' }],
                      raw: 'React.ReactElement[]',
                    },
                  ],
                },
                description: '',
              },
              ref: {
                required: !1,
                tsType: {
                  name: 'ReactRef',
                  raw: 'React.Ref<HTMLDivElement>',
                  elements: [{ name: 'HTMLDivElement' }],
                },
                description: '',
              },
            },
          });
      },
    './src/components/StudioResizableLayout/context/StudioResizableLayoutContext.ts': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.d(__webpack_exports__, { $: () => StudioResizableLayoutContext });
      const StudioResizableLayoutContext = __webpack_require__(
        '../../../node_modules/react/index.js',
      ).createContext(void 0);
    },
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioResizableLayout/StudioResizableLayoutContainer/StudioResizableLayoutContainer.module.css':
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
          '.rMnlkP6m29nPPKHATPcj {\n  display: flex;\n  flex-direction: row;\n  width: 100%;\n}\n',
          '',
          {
            version: 3,
            sources: [
              'webpack://./src/components/StudioResizableLayout/StudioResizableLayoutContainer/StudioResizableLayoutContainer.module.css',
            ],
            names: [],
            mappings: 'AAAA;EACE,aAAa;EACb,mBAAmB;EACnB,WAAW;AACb',
            sourcesContent: [
              '.root {\n  display: flex;\n  flex-direction: row;\n  width: 100%;\n}\n',
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = { root: 'rMnlkP6m29nPPKHATPcj' });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioResizableLayout/StudioResizableLayoutElement/StudioResizableLayoutElement.module.css':
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
          '.vfIDZ8ZQH3QGWDqArsJ_ {\n  display: flex;\n  overflow: auto;\n  position: relative;\n  flex: 1;\n}\n\n._3t8fy7HVDXKc_tbT2HU {\n  position: absolute;\n  z-index: 100;\n}\n',
          '',
          {
            version: 3,
            sources: [
              'webpack://./src/components/StudioResizableLayout/StudioResizableLayoutElement/StudioResizableLayoutElement.module.css',
            ],
            names: [],
            mappings:
              'AAAA;EACE,aAAa;EACb,cAAc;EACd,kBAAkB;EAClB,OAAO;AACT;;AAEA;EACE,kBAAkB;EAClB,YAAY;AACd',
            sourcesContent: [
              '.container {\n  display: flex;\n  overflow: auto;\n  position: relative;\n  flex: 1;\n}\n\n.resizingOverlay {\n  position: absolute;\n  z-index: 100;\n}\n',
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = {
            container: 'vfIDZ8ZQH3QGWDqArsJ_',
            resizingOverlay: '_3t8fy7HVDXKc_tbT2HU',
          });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioResizableLayout/StudioResizableLayoutHandle/StudioResizableLayoutHandle.module.css':
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
          ".b4k0ToYDsasKpVXVkexA {\n  flex: 0 0 1px;\n  position: relative;\n  background-color: var(--fds-semantic-border-neutral-subtle);\n}\n\n.b4k0ToYDsasKpVXVkexA:after {\n  z-index: 1;\n  content: '';\n  position: absolute;\n}\n\n.dhJNCeUDsOf9oKfxbXR4 {\n  cursor: col-resize;\n}\n\n.dhJNCeUDsOf9oKfxbXR4:after {\n  inset: 0 -5px 0 0;\n}\n\n.WHy7Yk7ohP3dFRXaIilS {\n  cursor: row-resize;\n}\n\n.WHy7Yk7ohP3dFRXaIilS:after {\n  inset: 0 0 -5px 0;\n}\n\n.TfgSdPQq0lYjFGPl3I8_ {\n}\n\n.TfgSdPQq0lYjFGPl3I8_:after {\n  left: 0px;\n}\n",
          '',
          {
            version: 3,
            sources: [
              'webpack://./src/components/StudioResizableLayout/StudioResizableLayoutHandle/StudioResizableLayoutHandle.module.css',
            ],
            names: [],
            mappings:
              'AAAA;EACE,aAAa;EACb,kBAAkB;EAClB,2DAA2D;AAC7D;;AAEA;EACE,UAAU;EACV,WAAW;EACX,kBAAkB;AACpB;;AAEA;EACE,kBAAkB;AACpB;;AAEA;EACE,iBAAiB;AACnB;;AAEA;EACE,kBAAkB;AACpB;;AAEA;EACE,iBAAiB;AACnB;;AAEA;AACA;;AAEA;EACE,SAAS;AACX',
            sourcesContent: [
              ".resizeHandle {\n  flex: 0 0 1px;\n  position: relative;\n  background-color: var(--fds-semantic-border-neutral-subtle);\n}\n\n.resizeHandle:after {\n  z-index: 1;\n  content: '';\n  position: absolute;\n}\n\n.resizeHandleH {\n  cursor: col-resize;\n}\n\n.resizeHandleH:after {\n  inset: 0 -5px 0 0;\n}\n\n.resizeHandleV {\n  cursor: row-resize;\n}\n\n.resizeHandleV:after {\n  inset: 0 0 -5px 0;\n}\n\n.hideLeftSide {\n}\n\n.hideLeftSide:after {\n  left: 0px;\n}\n",
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = {
            resizeHandle: 'b4k0ToYDsasKpVXVkexA',
            resizeHandleH: 'dhJNCeUDsOf9oKfxbXR4',
            resizeHandleV: 'WHy7Yk7ohP3dFRXaIilS',
            hideLeftSide: 'TfgSdPQq0lYjFGPl3I8_',
          });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
  },
]);
