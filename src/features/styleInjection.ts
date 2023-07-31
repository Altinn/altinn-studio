/**
 * This workaround will make sure that styles from libraries are injected before altinn-app-frontend.css
 * Otherwise we would have to use !important or unecessarily great specificity in our styles to override styles from libraries
 * @see https://github.com/Altinn/app-frontend-react/issues/1000
 */
const appendHead = document.head.appendChild.bind(document.head);
const referenceNode = document.querySelector('link');
document.head.appendChild = function (child) {
  if (child instanceof HTMLStyleElement) {
    return document.head.insertBefore(child, referenceNode);
  }
  return appendHead(child);
};
