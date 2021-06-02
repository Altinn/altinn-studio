/**
 * This script is to check if the infoportal of altinn has the downtime information
 * and print up or down to the console.
 */
import { parseHTML } from 'k6/html';
import http from 'k6/http';
import { baseUrl } from './config.js';

export default function () {
  const res = http.get('https://' + baseUrl);
  const doc = parseHTML(res.body);
  const availability = doc.find('body').find('h1').text();
  if (availability.includes('Altinn is unavailable at the moment')) console.log('down');
  else console.log('up');
}
