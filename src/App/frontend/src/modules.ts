declare module '*.png';

declare module '*.module.css';

declare module 'ajv-formats-draft2019' {
  import type Ajv from 'ajv/dist/core';
  function addAdditionalFormats(ajv: Ajv): void;
  export = addAdditionalFormats;
}
