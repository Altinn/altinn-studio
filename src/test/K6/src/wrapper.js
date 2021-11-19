import http from 'k6/http';
import { sleep } from 'k6';

//wrapper functions around k6 http methods enabling retrying requests when response code is 0, 408 and > 500

export function httpPost(url, body, params) {
  var res,
    retriedCount = 0;
  for (var retries = 3; retries > 0; retries--) {
    res = http.post(url, body, params);
    if (res.status != 0 && res.status != 408 && res.status < 500) {
      return res;
    }
    sleep(10);
    console.log(`Retry number: ${++retriedCount}`);
  }
  return res;
}

export function httpGet(url, params) {
  var res,
    retriedCount = 0;
  for (var retries = 3; retries > 0; retries--) {
    res = http.get(url, params);
    if (res.status != 0 && res.status != 408 && res.status < 500) {
      return res;
    }
    sleep(10);
    console.log(`Retry number: ${++retriedCount}`);
  }
  return res;
}
