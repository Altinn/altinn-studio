declare module '*.png';

declare module '*.module.css' {
  const styles: { [className: string]: string };
  // eslint-disable-next-line import/no-default-export
  export default styles;
}
