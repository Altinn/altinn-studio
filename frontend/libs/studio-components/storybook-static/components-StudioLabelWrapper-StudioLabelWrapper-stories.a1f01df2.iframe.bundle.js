/*! For license information please see components-StudioLabelWrapper-StudioLabelWrapper-stories.a1f01df2.iframe.bundle.js.LICENSE.txt */
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [4935],
  {
    './src/components/StudioLabelWrapper/StudioLabelWrapper.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
      __webpack_require__.d(__webpack_exports__, { W: () => StudioLabelWrapper });
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
        StudioLabelWrapper_module = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioLabelWrapper/StudioLabelWrapper.module.css',
        ),
        options = {};
      (options.styleTagTransform = styleTagTransform_default()),
        (options.setAttributes = setAttributesWithoutAttributes_default()),
        (options.insert = insertBySelector_default().bind(null, 'head')),
        (options.domAPI = styleDomAPI_default()),
        (options.insertStyleElement = insertStyleElement_default());
      injectStylesIntoStyleTag_default()(StudioLabelWrapper_module.A, options);
      const StudioLabelWrapper_StudioLabelWrapper_module =
        StudioLabelWrapper_module.A && StudioLabelWrapper_module.A.locals
          ? StudioLabelWrapper_module.A.locals
          : void 0;
      var classnames = __webpack_require__('../../../node_modules/classnames/index.js'),
        classnames_default = __webpack_require__.n(classnames);
      const StudioLabelWrapper = (0, react.forwardRef)(
        ({ children, className, withAsterisk, ...rest }, ref) => {
          const finalClassName = classnames_default()(
            StudioLabelWrapper_StudioLabelWrapper_module.studioLabelWrapper,
            withAsterisk && StudioLabelWrapper_StudioLabelWrapper_module.withAsterisk,
            className,
          );
          return react.createElement('span', { className: finalClassName, ...rest, ref }, children);
        },
      );
      (StudioLabelWrapper.displayName = 'StudioLabelWrapper'),
        (StudioLabelWrapper.__docgenInfo = {
          description: '',
          methods: [],
          displayName: 'StudioLabelWrapper',
        });
    },
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioLabelWrapper/StudioLabelWrapper.module.css':
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
          ".d55nB5yNOYJEV8biZwtz.x6viu3gGL0NUOnM7JsvQ::after {\n  content: '*';\n  color: var(--fds-semantic-text-warning-default);\n  margin-left: var(--fds-spacing-1);\n}\n",
          '',
          {
            version: 3,
            sources: [
              'webpack://./src/components/StudioLabelWrapper/StudioLabelWrapper.module.css',
            ],
            names: [],
            mappings: 'AAAA;EACE,YAAY;EACZ,+CAA+C;EAC/C,iCAAiC;AACnC',
            sourcesContent: [
              ".studioLabelWrapper.withAsterisk::after {\n  content: '*';\n  color: var(--fds-semantic-text-warning-default);\n  margin-left: var(--fds-spacing-1);\n}\n",
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = {
            studioLabelWrapper: 'd55nB5yNOYJEV8biZwtz',
            withAsterisk: 'x6viu3gGL0NUOnM7JsvQ',
          });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    './src/components/StudioLabelWrapper/StudioLabelWrapper.stories.tsx': (
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
        _StudioLabelWrapper__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioLabelWrapper/StudioLabelWrapper.tsx',
        );
      const meta = {
          title: 'StudioLabelWrapper',
          component: _StudioLabelWrapper__WEBPACK_IMPORTED_MODULE_1__.W,
        },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _StudioLabelWrapper__WEBPACK_IMPORTED_MODULE_1__.W,
            args,
          );
      Preview.args = { withAsterisk: !0, children: 'Label' };
      const __WEBPACK_DEFAULT_EXPORT__ = meta,
        __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource: '(args): React.ReactElement => <StudioLabelWrapper {...args} />',
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
