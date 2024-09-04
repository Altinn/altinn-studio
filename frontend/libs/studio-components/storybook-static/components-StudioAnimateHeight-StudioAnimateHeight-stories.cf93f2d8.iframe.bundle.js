/*! For license information please see components-StudioAnimateHeight-StudioAnimateHeight-stories.cf93f2d8.iframe.bundle.js.LICENSE.txt */
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [9591],
  {
    './src/components/StudioAnimateHeight/StudioAnimateHeight.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
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
    './src/hooks/index.ts': (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
      'use strict';
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
      'use strict';
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
      'use strict';
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
        'use strict';
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
    './src/components/StudioAnimateHeight/StudioAnimateHeight.stories.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
      __webpack_require__.r(__webpack_exports__),
        __webpack_require__.d(__webpack_exports__, {
          Preview: () => Preview,
          __namedExportsOrder: () => __namedExportsOrder,
          default: () => __WEBPACK_DEFAULT_EXPORT__,
        });
      var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        ),
        _StudioAnimateHeight__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioAnimateHeight/StudioAnimateHeight.tsx',
        );
      const meta = {
          title: 'StudioAnimateHeight',
          component: _StudioAnimateHeight__WEBPACK_IMPORTED_MODULE_1__.H,
        },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _StudioAnimateHeight__WEBPACK_IMPORTED_MODULE_1__.H,
            args,
          );
      Preview.args = { children: 'Change the open prop to see the animation in action', open: !0 };
      const __WEBPACK_DEFAULT_EXPORT__ = meta,
        __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource: '(args): React.ReactElement => <StudioAnimateHeight {...args} />',
            ...Preview.parameters?.docs?.source,
          },
        },
      };
    },
    '../../../node_modules/classnames/index.js': (module, exports) => {
      var __WEBPACK_AMD_DEFINE_RESULT__;
      !(function () {
        'use strict';
        var hasOwn = {}.hasOwnProperty;
        function classNames() {
          for (var classes = '', i = 0; i < arguments.length; i++) {
            var arg = arguments[i];
            arg && (classes = appendClass(classes, parseValue(arg)));
          }
          return classes;
        }
        function parseValue(arg) {
          if ('string' == typeof arg || 'number' == typeof arg) return arg;
          if ('object' != typeof arg) return '';
          if (Array.isArray(arg)) return classNames.apply(null, arg);
          if (
            arg.toString !== Object.prototype.toString &&
            !arg.toString.toString().includes('[native code]')
          )
            return arg.toString();
          var classes = '';
          for (var key in arg)
            hasOwn.call(arg, key) && arg[key] && (classes = appendClass(classes, key));
          return classes;
        }
        function appendClass(value, newClass) {
          return newClass ? (value ? value + ' ' + newClass : value + newClass) : value;
        }
        module.exports
          ? ((classNames.default = classNames), (module.exports = classNames))
          : void 0 ===
              (__WEBPACK_AMD_DEFINE_RESULT__ = function () {
                return classNames;
              }.apply(exports, [])) || (module.exports = __WEBPACK_AMD_DEFINE_RESULT__);
      })();
    },
  },
]);
