'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [3751],
  {
    './src/components/StudioTextfield/StudioTextfield.stories.tsx': (
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
        _StudioTextfield__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
          './src/components/StudioTextfield/StudioTextfield.tsx',
        );
      const meta = {
          title: 'StudioTextfield',
          component: _StudioTextfield__WEBPACK_IMPORTED_MODULE_1__.e,
          argTypes: { size: { control: 'radio', options: ['small', 'medium', 'large'] } },
        },
        Preview = (args) =>
          react__WEBPACK_IMPORTED_MODULE_0__.createElement(
            _StudioTextfield__WEBPACK_IMPORTED_MODULE_1__.e,
            args,
          );
      Preview.args = { label: 'Textfield', placeholder: '', error: '', size: 'small' };
      const __WEBPACK_DEFAULT_EXPORT__ = meta,
        __namedExportsOrder = ['Preview'];
      Preview.parameters = {
        ...Preview.parameters,
        docs: {
          ...Preview.parameters?.docs,
          source: {
            originalSource: 'args => <StudioTextfield {...args}></StudioTextfield>',
            ...Preview.parameters?.docs?.source,
          },
        },
      };
    },
  },
]);
