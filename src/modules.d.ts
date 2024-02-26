declare module '*.png';

declare module '*.module.css' {
  const styles: { [className: string]: string };
  // eslint-disable-next-line import/no-default-export
  export default styles;
}

declare module 'ajv-formats-draft2019' {
  import type Ajv from 'ajv/dist/core';
  function addAdditionalFormats(ajv: Ajv): void;
  export = addAdditionalFormats;
}
