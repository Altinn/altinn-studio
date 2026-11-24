import { expect } from '@playwright/test';
import type { Page, Request, Response, Route } from '@playwright/test';

import type { AltinnAppGlobalData } from 'src/global';

const REQUEST_TIMEOUT = 20_000;
const RESPONSE_TIMEOUT = 30_000;

export type RouteMatcher = {
  /** Playwright URL glob (`?` is literal, `*` stops at `/`, `**` does not) or a regular expression */
  url: string | RegExp;
  method?: string;
  /** Only handle the first n matching requests, like `times` in cy.intercept() */
  times?: number;
};

/** Handles an intercepted request. Call route.fulfill(), route.continue() or route.fallback(). */
export type InterceptHandler = (route: Route, request: Request) => Promise<void>;

/**
 * The requests matched by one intercept(). Works like a Cypress alias: wait() hands out matched requests in the order
 * they were made, each one once, including requests made before wait() was called.
 */
export class Interception {
  readonly requests: Request[] = [];
  private waited = 0;
  private listeners = new Set<(request: Request) => void>();

  /** @internal Called by intercept() for each matched request */
  record(request: Request) {
    this.requests.push(request);
    for (const listener of this.listeners) {
      listener(request);
    }
  }

  /** Waits for the next matched request that wait() has not yet returned, and for its response. */
  async wait(): Promise<Response> {
    const index = this.waited++;
    await expect
      .poll(() => this.requests.length, {
        message: `Expected request number ${index + 1} to the intercepted route`,
        timeout: REQUEST_TIMEOUT,
      })
      .toBeGreaterThan(index);
    const response = await withTimeout(this.requests[index].response(), RESPONSE_TIMEOUT);
    if (!response) {
      throw new Error(`Request to ${this.requests[index].url()} failed without a response`);
    }
    await response.finished();
    return response;
  }

  /**
   * Fails as soon as a request matches, and passes when none has for the given time. Proving that something does not
   * happen needs a time window. Use this only for that, never as a pause.
   */
  async expectNoRequestFor(milliseconds: number): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const onRequest = (request: Request) => {
        clearTimeout(timer);
        this.listeners.delete(onRequest);
        reject(new Error(`Expected no request for ${milliseconds} ms, but got ${request.method()} ${request.url()}`));
      };
      const timer = setTimeout(() => {
        this.listeners.delete(onRequest);
        resolve();
      }, milliseconds);
      this.listeners.add(onRequest);
    });
  }
}

/**
 * The equivalent of cy.intercept(). Without a handler, it only records matching requests and lets them through. Like
 * Cypress, the most recently registered handler for a request runs first, and route.fallback() hands the request on.
 */
export async function intercept(page: Page, matcher: RouteMatcher, handler?: InterceptHandler): Promise<Interception> {
  const interception = new Interception();
  let handled = 0;
  await page.route(matcher.url, async (route, request) => {
    const methodMatches = !matcher.method || request.method() === matcher.method.toUpperCase();
    if (!methodMatches || (matcher.times !== undefined && handled >= matcher.times)) {
      return route.fallback();
    }
    handled++;
    interception.record(request);
    return handler ? handler(route, request) : route.fallback();
  });
  return interception;
}

type StaticResponse = {
  statusCode?: number;
  body?: string | object;
  /** Milliseconds to wait before responding, like `delay` in a Cypress StaticResponse */
  delay?: number;
};

/**
 * Responds without contacting the server, like passing a StaticResponse to cy.intercept(). As in Cypress, any of
 * these keys makes the response static: `{ delay: 200 }` alone answers 200 with an empty body after 200 ms.
 */
export function staticResponse({ statusCode = 200, body, delay }: StaticResponse): InterceptHandler {
  return async (route) => {
    if (delay) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    if (body === undefined || typeof body === 'string') {
      return route.fulfill({ status: statusCode, body: body ?? '' });
    }
    return route.fulfill({ status: statusCode, json: body });
  };
}

/** Lets the request reach the server and changes the JSON response, like req.on('response') with res.send(). */
export function modifyJsonResponse<T>(modifier: (body: T, request: Request) => T | void): InterceptHandler {
  return async (route, request) => {
    const response = await route.fetch();
    const body = (await response.json()) as T;
    const modified = modifier(body, request) ?? body;
    await route.fulfill({ response, json: modified });
  };
}

/**
 * Changes window.altinnAppGlobalData in the HTML page the app is served from. Call it before startAppInstance().
 * @see test/e2e/support/intercept-global-data.ts
 */
export async function interceptAltinnAppGlobalData(
  page: Page,
  modifier: (globalData: AltinnAppGlobalData) => void,
): Promise<Interception> {
  return intercept(page, { method: 'GET', url: '**/ttd/**' }, async (route, request) => {
    if (!/text\/html/.test((await request.allHeaders())['accept'] ?? '')) {
      return route.fallback();
    }

    const response = await route.fetch();
    const body = await response.text();
    const match = body.match(/window\.altinnAppGlobalData\s*=\s*(\{[\s\S]*?\});/);
    if (!match) {
      return route.fulfill({ response, body });
    }

    const globalData = JSON.parse(match[1]) as AltinnAppGlobalData;
    modifier(globalData);
    await route.fulfill({
      response,
      body: body.replace(
        /window\.altinnAppGlobalData\s*=\s*\{[\s\S]*?\};/,
        () => `window.altinnAppGlobalData = ${JSON.stringify(globalData)};`,
      ),
    });
  });
}

async function withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${timeout} ms waiting for a response`)), timeout);
  });
  try {
    return await Promise.race([promise, timedOut]);
  } finally {
    clearTimeout(timer);
  }
}
