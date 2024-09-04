/*! For license information please see components-StudioTreeView-StudioTreeView-stories.10fd109a.iframe.bundle.js.LICENSE.txt */
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [5643],
  {
    '../../../node_modules/@digdir/designsystemet-react/dist/esm/components/Button/Button.js': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
      __webpack_require__.d(__webpack_exports__, { $: () => Button });
      var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/react/jsx-runtime.js',
        ),
        react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        ),
        _node_modules_clsx_dist_lite_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/clsx/dist/lite.js',
        ),
        _node_modules_radix_ui_react_slot_dist_index_js__WEBPACK_IMPORTED_MODULE_3__ =
          __webpack_require__(
            '../../../node_modules/@digdir/designsystemet-react/dist/esm/node_modules/@radix-ui/react-slot/dist/index.js',
          ),
        _utilities_getSize_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          '../../../node_modules/@digdir/designsystemet-react/dist/esm/utilities/getSize.js',
        );
      const Button = (0, react__WEBPACK_IMPORTED_MODULE_1__.forwardRef)(
        (
          {
            children,
            color = 'first',
            variant = 'primary',
            fullWidth = !1,
            icon = !1,
            type = 'button',
            className,
            asChild,
            ...rest
          },
          ref,
        ) => {
          const size = (0, _utilities_getSize_js__WEBPACK_IMPORTED_MODULE_2__.Y)(rest.size || 'md'),
            Component = asChild
              ? _node_modules_radix_ui_react_slot_dist_index_js__WEBPACK_IMPORTED_MODULE_3__.D
              : 'button';
          return (0, react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx)(Component, {
            ref,
            type,
            className: (0, _node_modules_clsx_dist_lite_js__WEBPACK_IMPORTED_MODULE_4__.$)(
              'fds-btn',
              'fds-focus',
              `fds-btn--${size}`,
              `fds-btn--${variant}`,
              `fds-btn--${color}`,
              fullWidth && 'fds-btn--full-width',
              icon && 'fds-btn--icon-only',
              className,
            ),
            ...rest,
            children,
          });
        },
      );
      Button.displayName = 'Button';
    },
    './src/components/StudioTreeView/StudioTreeView.stories.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      'use strict';
      __webpack_require__.r(__webpack_exports__),
        __webpack_require__.d(__webpack_exports__, {
          Preview: () => Preview,
          WithIcon: () => WithIcon,
          __namedExportsOrder: () => __namedExportsOrder,
          default: () => __WEBPACK_DEFAULT_EXPORT__,
        });
      var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        ),
        _index__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioTreeView/index.ts',
        ),
        _studio_icons__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          '../studio-icons/src/index.ts',
        );
      const PreviewComponent = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _index__WEBPACK_IMPORTED_MODULE_1__.c.Root,
            null,
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(
              _index__WEBPACK_IMPORTED_MODULE_1__.c.Item,
              args,
            ),
          ),
        meta = { title: 'StudioTreeView', component: PreviewComponent },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(PreviewComponent, args);
      Preview.args = { children: 'MyFile.pdf', label: 'Folder name', nodeId: '1' };
      const WithIcon = (args) =>
        react__WEBPACK_IMPORTED_MODULE_0__.createElement(PreviewComponent, args);
      WithIcon.args = {
        children: 'MyFile.pdf',
        label: 'Folder name',
        nodeId: '1',
        icon: react__WEBPACK_IMPORTED_MODULE_0__.createElement(
          _studio_icons__WEBPACK_IMPORTED_MODULE_2__.PencilIcon,
          null,
        ),
      };
      const __WEBPACK_DEFAULT_EXPORT__ = meta,
        __namedExportsOrder = ['Preview', 'WithIcon'];
      (Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource: '(args): React.ReactElement => <PreviewComponent {...args} />',
            ...Preview.parameters?.docs?.source,
          },
        },
      }),
        (WithIcon.parameters = {
          ...WithIcon.parameters,
          docs: {
            ...WithIcon.parameters?.docs,
            source: {
              originalSource: '(args): React.ReactElement => <PreviewComponent {...args} />',
              ...WithIcon.parameters?.docs?.source,
            },
          },
        });
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
