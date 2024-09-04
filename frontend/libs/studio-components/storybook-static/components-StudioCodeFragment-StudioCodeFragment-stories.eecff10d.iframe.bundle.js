/*! For license information please see components-StudioCodeFragment-StudioCodeFragment-stories.eecff10d.iframe.bundle.js.LICENSE.txt */
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [9599],
  {
    './src/components/StudioCodeFragment/StudioCodeFragment.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
      __webpack_require__.d(__webpack_exports__, { o: () => StudioCodeFragment });
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
        StudioCodeFragment_module = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioCodeFragment/StudioCodeFragment.module.css',
        ),
        options = {};
      (options.styleTagTransform = styleTagTransform_default()),
        (options.setAttributes = setAttributesWithoutAttributes_default()),
        (options.insert = insertBySelector_default().bind(null, 'head')),
        (options.domAPI = styleDomAPI_default()),
        (options.insertStyleElement = insertStyleElement_default());
      injectStylesIntoStyleTag_default()(StudioCodeFragment_module.A, options);
      const StudioCodeFragment_StudioCodeFragment_module =
          StudioCodeFragment_module.A && StudioCodeFragment_module.A.locals
            ? StudioCodeFragment_module.A.locals
            : void 0,
        StudioCodeFragment = (0, react.forwardRef)(
          ({ children, className: givenClass, ...rest }, ref) => {
            const className = classnames_default()(
              StudioCodeFragment_StudioCodeFragment_module.code,
              givenClass,
            );
            return react.createElement('code', { className, ...rest, ref }, children);
          },
        );
      (StudioCodeFragment.displayName = 'StudioCodeFragment'),
        (StudioCodeFragment.__docgenInfo = {
          description: '',
          methods: [],
          displayName: 'StudioCodeFragment',
        });
    },
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioCodeFragment/StudioCodeFragment.module.css':
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
          ".JgCEdzE5cHln1_Du1XTg {\n  flex: 1;\n  background-color: var(--fds-semantic-surface-neutral-subtle);\n  border: 1px solid var(--fds-semantic-border-neutral-subtle);\n  border-radius: var(--fds-border_radius-small);\n  font-family: 'Courier New', monospace;\n  font-size: 0.8em;\n  padding: 0 var(--fds-spacing-1);\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n",
          '',
          {
            version: 3,
            sources: [
              'webpack://./src/components/StudioCodeFragment/StudioCodeFragment.module.css',
            ],
            names: [],
            mappings:
              'AAAA;EACE,OAAO;EACP,4DAA4D;EAC5D,2DAA2D;EAC3D,6CAA6C;EAC7C,qCAAqC;EACrC,gBAAgB;EAChB,+BAA+B;EAC/B,gBAAgB;EAChB,uBAAuB;AACzB',
            sourcesContent: [
              ".code {\n  flex: 1;\n  background-color: var(--fds-semantic-surface-neutral-subtle);\n  border: 1px solid var(--fds-semantic-border-neutral-subtle);\n  border-radius: var(--fds-border_radius-small);\n  font-family: 'Courier New', monospace;\n  font-size: 0.8em;\n  padding: 0 var(--fds-spacing-1);\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n",
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = { code: 'JgCEdzE5cHln1_Du1XTg' });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    './src/components/StudioCodeFragment/StudioCodeFragment.stories.tsx': (
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
        _StudioCodeFragment__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioCodeFragment/StudioCodeFragment.tsx',
        );
      const __WEBPACK_DEFAULT_EXPORT__ = {
          title: 'StudioCodeFragment',
          component: _StudioCodeFragment__WEBPACK_IMPORTED_MODULE_1__.o,
        },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _StudioCodeFragment__WEBPACK_IMPORTED_MODULE_1__.o,
            args,
          );
      Preview.args = {
        children: 'Please use the h1-tag like this: <h1>This is the main title</h1>',
      };
      const __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource: 'args => <StudioCodeFragment {...args}></StudioCodeFragment>',
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
