import { EventListeners } from './EventListeners';

describe('EventListeners', () => {
  describe('add', () => {
    it('Adds a listener to the given event', () => {
      const eventListeners = new EventListeners<{ event: () => void }>();
      const fun = jest.fn();
      const eventName = 'event';

      eventListeners.add(eventName, fun);
      eventListeners.triggerEvent(eventName);

      expect(fun).toHaveBeenCalledTimes(1);
    });

    it('Supports adding multiple listeners to the same event', () => {
      const eventListeners = new EventListeners<{ event: () => void }>();
      const fun1 = jest.fn();
      const fun2 = jest.fn();
      const eventName = 'event';

      eventListeners.add(eventName, fun1);
      eventListeners.add(eventName, fun2);
      eventListeners.triggerEvent(eventName);

      expect(fun1).toHaveBeenCalledTimes(1);
      expect(fun2).toHaveBeenCalledTimes(1);
    });

    it('Supports adding listeners to multiple events', () => {
      const eventListeners = new EventListeners<Record<'event1' | 'event2', () => void>>();
      const event1Fun = jest.fn();
      const event2Fun = jest.fn();
      const event1Name = 'event1';
      const event2Name = 'event2';

      eventListeners.add(event1Name, event1Fun);
      eventListeners.add(event2Name, event2Fun);
      eventListeners.triggerEvent(event1Name);
      eventListeners.triggerEvent(event2Name);

      expect(event1Fun).toHaveBeenCalledTimes(1);
      expect(event2Fun).toHaveBeenCalledTimes(1);
    });

    it('Supports adding the same function to multiple events', () => {
      const eventListeners = new EventListeners<Record<'event1' | 'event2', () => void>>();
      const fun = jest.fn();
      const event1Name = 'event1';
      const event2Name = 'event2';

      eventListeners.add(event1Name, fun);
      eventListeners.add(event2Name, fun);
      eventListeners.triggerEvent(event1Name);
      eventListeners.triggerEvent(event2Name);

      expect(fun).toHaveBeenCalledTimes(2);
    });
  });

  describe('remove', () => {
    it('Removes the given function from the given event listener', () => {
      const eventListeners = new EventListeners<{ event: () => void }>();
      const fun = jest.fn();
      const eventName = 'event';
      eventListeners.add(eventName, fun);

      eventListeners.remove(eventName, fun);
      eventListeners.triggerEvent(eventName);

      expect(fun).not.toHaveBeenCalled();
    });

    it('Does not remove other functions than the given one', () => {
      const eventListeners = new EventListeners<
        Record<'event.of.interest' | 'another.event', () => void>
      >();
      const funToRemove = jest.fn();
      const funOnSameEvent = jest.fn();
      const funOnAnotherEvent = jest.fn();
      const eventOfInterestName = 'event.of.interest';
      const anotherEventName = 'another.event';
      eventListeners.add(eventOfInterestName, funToRemove);
      eventListeners.add(eventOfInterestName, funOnSameEvent);
      eventListeners.add(anotherEventName, funOnAnotherEvent);

      eventListeners.remove(eventOfInterestName, funToRemove);
      eventListeners.triggerEvent(eventOfInterestName);
      eventListeners.triggerEvent(anotherEventName);

      expect(funOnSameEvent).toHaveBeenCalled();
      expect(funOnAnotherEvent).toHaveBeenCalled();
      expect(funToRemove).not.toHaveBeenCalled();
    });

    it('Does only remove the function on the given event listener when the same function also exists on another listener', () => {
      const eventListeners = new EventListeners<
        Record<'event.of.interest' | 'another.event', () => void>
      >();
      const funToRemoveFromSingleEvent = jest.fn();
      const eventOfInterestName = 'event.of.interest';
      const anotherEventName = 'another.event';
      eventListeners.add(eventOfInterestName, funToRemoveFromSingleEvent);
      eventListeners.add(anotherEventName, funToRemoveFromSingleEvent);

      eventListeners.remove(eventOfInterestName, funToRemoveFromSingleEvent);
      eventListeners.triggerEvent(eventOfInterestName);
      eventListeners.triggerEvent(anotherEventName);

      expect(funToRemoveFromSingleEvent).toHaveBeenCalledTimes(1);
    });

    it('Throws the expected error when attempting to remove a function that is not added', () => {
      const eventListeners = new EventListeners<{ event: () => void }>();
      const fun = jest.fn();
      const eventName = 'event';

      expect(() => eventListeners.remove(eventName, fun)).toThrow(
        `The provided callback function does not exist on the ${eventName} listener.`,
      );
    });
  });

  describe('triggerEvent', () => {
    it('Calls all the functions added to the given event listener with correct parameters', () => {
      const eventListeners = new EventListeners<{ event: (p: string) => void }>();
      const fun1 = jest.fn();
      const fun2 = jest.fn();
      const eventName = 'event';
      eventListeners.add(eventName, fun1);
      eventListeners.add(eventName, fun2);
      const param = 'test';

      eventListeners.triggerEvent(eventName, param);

      expect(fun1).toHaveBeenCalledTimes(1);
      expect(fun1).toHaveBeenCalledWith(param);
      expect(fun2).toHaveBeenCalledTimes(1);
      expect(fun2).toHaveBeenCalledWith(param);
    });

    it('Supports functions with multiple parameters', () => {
      const eventListeners = new EventListeners<{
        event: (p1: string, p2: number, p3: boolean) => void;
      }>();
      const fun = jest.fn();
      const eventName = 'event';
      eventListeners.add(eventName, fun);
      const param1 = 'test';
      const param2 = 1;
      const param3 = true;

      eventListeners.triggerEvent(eventName, param1, param2, param3);

      expect(fun).toHaveBeenCalledTimes(1);
      expect(fun).toHaveBeenCalledWith(param1, param2, param3);
    });

    it('Supports functions with no parameters', () => {
      const eventListeners = new EventListeners<{ event: () => void }>();
      const fun = jest.fn();
      const eventName = 'event';
      eventListeners.add(eventName, fun);

      eventListeners.triggerEvent(eventName);

      expect(fun).toHaveBeenCalledTimes(1);
      expect(fun).toHaveBeenCalledWith();
    });

    it('Does not call functions on other listeners than the given one', () => {
      const eventListeners = new EventListeners<
        Record<'event.of.interest' | 'another.event', () => void>
      >();
      const funOfInterest = jest.fn();
      const funOnAnotherEvent = jest.fn();
      const eventOfInterestName = 'event.of.interest';
      const anotherEventName = 'another.event';
      eventListeners.add(eventOfInterestName, funOfInterest);
      eventListeners.add(anotherEventName, funOnAnotherEvent);

      eventListeners.triggerEvent(eventOfInterestName);

      expect(funOnAnotherEvent).not.toHaveBeenCalled();
      expect(funOfInterest).toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('Removes all listeners', () => {
      const eventListeners = new EventListeners<Record<'event1' | 'event2', () => void>>();
      const event1Fun1 = jest.fn();
      const event1Fun2 = jest.fn();
      const event2Fun = jest.fn();
      const event1Name = 'event1';
      const event2Name = 'event2';
      eventListeners.add(event1Name, event1Fun1);
      eventListeners.add(event1Name, event1Fun2);
      eventListeners.add(event2Name, event2Fun);

      eventListeners.clear();
      eventListeners.triggerEvent(event1Name);
      eventListeners.triggerEvent(event2Name);

      expect(event1Fun1).not.toHaveBeenCalled();
      expect(event1Fun2).not.toHaveBeenCalled();
      expect(event2Fun).not.toHaveBeenCalled();
    });
  });
});
