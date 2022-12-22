declare module '*.svg' {
  import React = require('react');
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const content: string;
  export default content;
}

interface Mapping {
  [key: string]: string;
}
declare module '*.module.css' {
  const mapping: Mapping;
  export default mapping;
}
