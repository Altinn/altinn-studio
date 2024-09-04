'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [7539],
  {
    './src/components/StudioIconTextfield/StudioIconTextfield.stories.tsx': (
      __unused_webpack_module,
      __webpack_exports__,
      __webpack_require__,
    ) => {
      __webpack_require__.r(__webpack_exports__),
        __webpack_require__.d(__webpack_exports__, {
          Preview: () => Preview,
          __namedExportsOrder: () => __namedExportsOrder,
          default: () => __WEBPACK_DEFAULT_EXPORT__,
        });
      var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
          '../../../node_modules/react/index.js',
        ),
        _studio_icons__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          '../studio-icons/src/index.ts',
        ),
        _StudioIconTextfield__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
          './src/components/StudioIconTextfield/StudioIconTextfield.tsx',
        );
      const __WEBPACK_DEFAULT_EXPORT__ = {
          title: 'StudioIconTextfield',
          component: _StudioIconTextfield__WEBPACK_IMPORTED_MODULE_2__.l,
          argTypes: { value: { control: 'text' } },
        },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _StudioIconTextfield__WEBPACK_IMPORTED_MODULE_2__.l,
            args,
          );
      Preview.args = {
        icon: react__WEBPACK_IMPORTED_MODULE_0__.createElement(
          _studio_icons__WEBPACK_IMPORTED_MODULE_1__.PencilIcon,
          null,
        ),
        value: 2.3,
        error: 'Your custom error message!',
      };
      const __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource: 'args => <StudioIconTextfield {...args}></StudioIconTextfield>',
            ...Preview.parameters?.docs?.source,
          },
        },
      };
    },
  },
]);
