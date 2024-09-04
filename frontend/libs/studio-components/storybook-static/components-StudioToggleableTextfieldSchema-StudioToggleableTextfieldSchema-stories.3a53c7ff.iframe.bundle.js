'use strict';
(self.webpackChunk_studio_components = self.webpackChunk_studio_components || []).push([
  [3355],
  {
    './src/components/StudioToggleableTextfieldSchema/StudioToggleableTextfieldSchema.stories.tsx':
      (__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
        __webpack_require__.r(__webpack_exports__),
          __webpack_require__.d(__webpack_exports__, {
            Preview: () => Preview,
            __namedExportsOrder: () => __namedExportsOrder,
            default: () => __WEBPACK_DEFAULT_EXPORT__,
          });
        var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(
            '../../../node_modules/react/index.js',
          ),
          _StudioToggleableTextfieldSchema__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(
            './src/components/StudioToggleableTextfieldSchema/StudioToggleableTextfieldSchema.tsx',
          ),
          _studio_icons__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(
            '../studio-icons/src/index.ts',
          );
        const meta = {
            title: 'StudioToggleableTextfieldSchema',
            component: _StudioToggleableTextfieldSchema__WEBPACK_IMPORTED_MODULE_1__.X,
          },
          Preview = (args) =>
            react__WEBPACK_IMPORTED_MODULE_0__.createElement(
              _StudioToggleableTextfieldSchema__WEBPACK_IMPORTED_MODULE_1__.X,
              args,
            );
        Preview.args = {
          viewProps: { variant: 'tertiary', size: 'small', children: 'My awesome value' },
          inputProps: {
            icon: react__WEBPACK_IMPORTED_MODULE_0__.createElement(
              _studio_icons__WEBPACK_IMPORTED_MODULE_2__.KeyVerticalIcon,
              null,
            ),
            label: 'My awesome label',
            size: 'small',
            placeholder: 'Placeholder',
            error: '',
          },
        };
        const __WEBPACK_DEFAULT_EXPORT__ = meta,
          __namedExportsOrder = ['Preview'];
        Preview.parameters = {
          ...Preview.parameters,
          docs: {
            ...Preview.parameters?.docs,
            source: {
              originalSource:
                'args => <StudioToggleableTextfieldSchema {...args}></StudioToggleableTextfieldSchema>',
              ...Preview.parameters?.docs?.source,
            },
          },
        };
      },
  },
]);
