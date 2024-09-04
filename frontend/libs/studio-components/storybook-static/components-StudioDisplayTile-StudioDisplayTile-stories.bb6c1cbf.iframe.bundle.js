/*! For license information please see components-StudioDisplayTile-StudioDisplayTile-stories.bb6c1cbf.iframe.bundle.js.LICENSE.txt */
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [5211],
  {
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        'use strict';
        __webpack_require__.d(__webpack_exports__, { f: () => Paragraph });
        var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
            '../../../node_modules/react/jsx-runtime.js',
          ),
          react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
            '../../../node_modules/react/index.js',
          ),
          _node_modules_clsx_dist_lite_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
          ),
          _node_modules_radix_ui_react_slot_dist_index_js__WEBPACK_IMPORTED_MODULE_2__ =
            __webpack_require__(
              '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@radix-ui/react-slot/dist/index.js',
            ),
          _utilities_getSize_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/getSize.js',
          );
        const Paragraph = (0, react__WEBPACK_IMPORTED_MODULE_1__.forwardRef)(
          ({ className, spacing, asChild, variant, ...rest }, ref) => {
            const Component = asChild
                ? _node_modules_radix_ui_react_slot_dist_index_js__WEBPACK_IMPORTED_MODULE_2__.D
                : 'p',
              size = (0, _utilities_getSize_js__WEBPACK_IMPORTED_MODULE_3__.Y)(rest.size || 'md');
            return (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Component, {
              ref,
              className: (0, _node_modules_clsx_dist_lite_js__WEBPACK_IMPORTED_MODULE_4__.$)(
                'fds-paragraph',
                `fds-paragraph--${size}`,
                spacing && 'fds-paragraph--spacing',
                variant && `fds-paragraph--${variant}`,
                className,
              ),
              ...rest,
            });
          },
        );
        Paragraph.displayName = 'Paragraph';
      },
    './src/components/StudioDisplayTile/StudioDisplayTile.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
      __webpack_require__.d(__webpack_exports__, { R: () => StudioDisplayTile });
      var react = __webpack_require__('../../../node_modules/react/index.js'),
        src = __webpack_require__('../studio-icons/src/index.ts'),
        classnames = __webpack_require__('../../../node_modules/classnames/index.js'),
        classnames_default = __webpack_require__.n(classnames),
        Paragraph = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Typography/Paragraph/Paragraph.js',
        ),
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
        StudioDisplayTile_module = __webpack_require__(
          '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioDisplayTile/StudioDisplayTile.module.css',
        ),
        options = {};
      (options.styleTagTransform = styleTagTransform_default()),
        (options.setAttributes = setAttributesWithoutAttributes_default()),
        (options.insert = insertBySelector_default().bind(null, 'head')),
        (options.domAPI = styleDomAPI_default()),
        (options.insertStyleElement = insertStyleElement_default());
      injectStylesIntoStyleTag_default()(StudioDisplayTile_module.A, options);
      const StudioDisplayTile_StudioDisplayTile_module =
          StudioDisplayTile_module.A && StudioDisplayTile_module.A.locals
            ? StudioDisplayTile_module.A.locals
            : void 0,
        StudioDisplayTile = (0, react.forwardRef)(
          ({ icon, label, value, className: givenClassName, showPadlock = !0, ...rest }, ref) => {
            const className = classnames_default()(
              givenClassName,
              StudioDisplayTile_StudioDisplayTile_module.container,
            );
            return react.createElement(
              'div',
              { ...rest, className, ref },
              react.createElement(
                'div',
                { className: StudioDisplayTile_StudioDisplayTile_module.innerContainer },
                react.createElement(
                  'div',
                  { className: StudioDisplayTile_StudioDisplayTile_module.iconLabelContainer },
                  icon ?? null,
                  react.createElement(
                    Paragraph.f,
                    { size: 'small', className: StudioDisplayTile_StudioDisplayTile_module.label },
                    label,
                  ),
                ),
                react.createElement(Paragraph.f, { size: 'small' }, value),
              ),
              showPadlock &&
                react.createElement(src.PadlockLockedFillIcon, {
                  'data-testid': 'padlockIconTestId',
                }),
            );
          },
        );
      (StudioDisplayTile.displayName = 'StudioDisplayTile'),
        (StudioDisplayTile.__docgenInfo = {
          description: '',
          methods: [],
          displayName: 'StudioDisplayTile',
          props: {
            icon: {
              required: !1,
              tsType: { name: 'ReactReactNode', raw: 'React.ReactNode' },
              description: '',
            },
            label: { required: !0, tsType: { name: 'string' }, description: '' },
            value: { required: !0, tsType: { name: 'string' }, description: '' },
            showPadlock: {
              required: !1,
              tsType: { name: 'boolean' },
              description: '',
              defaultValue: { value: 'true', computed: !1 },
            },
          },
        });
    },
    '../../../node_modules/@storybook/builder-webpack5/node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[6].use[1]!./src/components/StudioDisplayTile/StudioDisplayTile.module.css':
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
          '.gR9DuXr4SQj55IpEunGr {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  flex: 1;\n  gap: var(--fds-spacing-2);\n  padding: var(--fds-spacing-2) var(--fds-spacing-3);\n}\n\n.guJybmjbbTOJx2L9QsVy {\n  display: flex;\n  gap: var(--fds-spacing-1);\n}\n\n.U7kRh_GxfP1hc0hoBM2Z {\n  font-weight: 500;\n}\n\n.EfD8f7y2hhXtRJ6OIiZ6 {\n  display: flex;\n  align-items: center;\n}\n',
          '',
          {
            version: 3,
            sources: ['webpack://./src/components/StudioDisplayTile/StudioDisplayTile.module.css'],
            names: [],
            mappings:
              'AAAA;EACE,aAAa;EACb,mBAAmB;EACnB,8BAA8B;EAC9B,OAAO;EACP,yBAAyB;EACzB,kDAAkD;AACpD;;AAEA;EACE,aAAa;EACb,yBAAyB;AAC3B;;AAEA;EACE,gBAAgB;AAClB;;AAEA;EACE,aAAa;EACb,mBAAmB;AACrB',
            sourcesContent: [
              '.container {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  flex: 1;\n  gap: var(--fds-spacing-2);\n  padding: var(--fds-spacing-2) var(--fds-spacing-3);\n}\n\n.innerContainer {\n  display: flex;\n  gap: var(--fds-spacing-1);\n}\n\n.label {\n  font-weight: 500;\n}\n\n.iconLabelContainer {\n  display: flex;\n  align-items: center;\n}\n',
            ],
            sourceRoot: '',
          },
        ]),
          (___CSS_LOADER_EXPORT___.locals = {
            container: 'gR9DuXr4SQj55IpEunGr',
            innerContainer: 'guJybmjbbTOJx2L9QsVy',
            label: 'U7kRh_GxfP1hc0hoBM2Z',
            iconLabelContainer: 'EfD8f7y2hhXtRJ6OIiZ6',
          });
        const __WEBPACK_DEFAULT_EXPORT__ = ___CSS_LOADER_EXPORT___;
      },
    './src/components/StudioDisplayTile/StudioDisplayTile.stories.tsx': (
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
        _StudioDisplayTile__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioDisplayTile/StudioDisplayTile.tsx',
        ),
        _studio_icons__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          '../studio-icons/src/index.ts',
        );
      const meta = {
          title: 'StudioDisplayTile',
          component: _StudioDisplayTile__WEBPACK_IMPORTED_MODULE_1__.R,
        },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _StudioDisplayTile__WEBPACK_IMPORTED_MODULE_1__.R,
            args,
          );
      Preview.args = {
        label: 'Label',
        value: 'Value',
        icon: react__WEBPACK_IMPORTED_MODULE_0__.createElement(
          _studio_icons__WEBPACK_IMPORTED_MODULE_2__.PencilIcon,
          null,
        ),
      };
      const __WEBPACK_DEFAULT_EXPORT__ = meta,
        __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource: '(args): React.ReactElement => <StudioDisplayTile {...args} />',
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
