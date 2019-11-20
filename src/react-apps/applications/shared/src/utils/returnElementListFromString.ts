import ReactHtmlParser from 'react-html-parser';

export function returnElementListFromString(elementString: string) {
  return ReactHtmlParser(elementString);
}
