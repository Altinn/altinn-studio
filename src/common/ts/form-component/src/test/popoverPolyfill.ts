// jsdom hides [popover] elements but has no Popover API, so they can never be shown:
// https://github.com/jsdom/jsdom/issues/3721
// Open popovers get an attribute that an author stylesheet shows. Toggle events fire as in browsers.
const popoverOpenAttribute = 'data-test-popover-open';

type PopoverState = 'open' | 'closed';

class ToggleEventPolyfill extends Event {
  readonly oldState: string;
  readonly newState: string;
  readonly source: Element | null;

  constructor(type: string, init: ToggleEventInit = {}) {
    super(type, init);
    this.oldState = init.oldState ?? '';
    this.newState = init.newState ?? '';
    this.source = init.source ?? null;
  }
}

const pendingToggleEvents = new WeakMap<
  HTMLElement,
  { oldState: PopoverState; newState: PopoverState }
>();

function isOpen(element: HTMLElement): boolean {
  return element.hasAttribute(popoverOpenAttribute);
}

function assertIsPopover(element: HTMLElement) {
  if (element.popover === null) {
    throw new DOMException('Element does not have the popover attribute', 'NotSupportedError');
  }
}

function queueToggleEvent(element: HTMLElement, oldState: PopoverState, newState: PopoverState) {
  const pending = pendingToggleEvents.get(element);
  if (pending) {
    pending.newState = newState;
    return;
  }

  const event = { oldState, newState };
  pendingToggleEvents.set(element, event);
  setTimeout(() => {
    pendingToggleEvents.delete(element);
    element.dispatchEvent(new ToggleEvent('toggle', event));
  });
}

function showPopover(this: HTMLElement) {
  assertIsPopover(this);
  if (isOpen(this)) {
    return;
  }

  const beforeToggle = new ToggleEvent('beforetoggle', {
    cancelable: true,
    oldState: 'closed',
    newState: 'open',
  });
  if (!this.dispatchEvent(beforeToggle)) {
    return;
  }

  this.setAttribute(popoverOpenAttribute, '');
  queueToggleEvent(this, 'closed', 'open');
}

function hidePopover(this: HTMLElement) {
  assertIsPopover(this);
  if (!isOpen(this)) {
    return;
  }

  this.dispatchEvent(new ToggleEvent('beforetoggle', { oldState: 'open', newState: 'closed' }));
  this.removeAttribute(popoverOpenAttribute);
  queueToggleEvent(this, 'open', 'closed');
}

function togglePopover(
  this: HTMLElement,
  options?: Parameters<HTMLElement['togglePopover']>[0],
): boolean {
  const force = typeof options === 'object' ? options.force : options;
  const shouldOpen = force ?? !isOpen(this);
  if (shouldOpen) {
    showPopover.call(this);
  } else {
    hidePopover.call(this);
  }
  return isOpen(this);
}

function installPopoverPolyfill() {
  if (typeof HTMLElement.prototype.showPopover === 'function') {
    return;
  }

  if (!('ToggleEvent' in globalThis)) {
    globalThis.ToggleEvent = ToggleEventPolyfill as typeof ToggleEvent;
  }

  Object.defineProperty(HTMLElement.prototype, 'popover', {
    configurable: true,
    get(this: HTMLElement) {
      const value = this.getAttribute('popover');
      if (value === null) {
        return null;
      }
      const normalized = value.toLowerCase();
      if (normalized === '' || normalized === 'auto') {
        return 'auto';
      }
      return normalized === 'hint' ? 'hint' : 'manual';
    },
    set(this: HTMLElement, value: string | null) {
      if (value === null) {
        this.removeAttribute('popover');
      } else {
        this.setAttribute('popover', value);
      }
    },
  });
  HTMLElement.prototype.showPopover = showPopover;
  HTMLElement.prototype.hidePopover = hidePopover;
  HTMLElement.prototype.togglePopover = togglePopover;

  const popoverStyle = document.createElement('style');
  popoverStyle.textContent = `[popover][${popoverOpenAttribute}] { display: block !important; }`;
  document.head.appendChild(popoverStyle);
}

installPopoverPolyfill();
