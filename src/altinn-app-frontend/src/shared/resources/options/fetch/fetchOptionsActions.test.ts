import {
  fetchOptionsFulfilled,
  fetchOptionsRejected,
} from "./fetchOptionsActions";

describe("fetchOptionsActions", () => {
  it("should create an action with correct type: OPTIONS.FETCH_OPTIONS_FULFILLED", () => {
    const expectedAction = {
      type: "OPTIONS.FETCH_OPTIONS_FULFILLED",
      options: [],
      optionsKey: "options-id",
    };
    expect(fetchOptionsFulfilled("options-id", [])).toEqual(expectedAction);
  });

  it("should create an action with correct type: OPTIONS.FETCH_OPTIONS_REJECTED", () => {
    const mockError: Error = new Error("error message");
    const expectedAction = {
      optionsKey: "options-id",
      type: "OPTIONS.FETCH_OPTIONS_REJECTED",
      error: mockError,
    };
    expect(fetchOptionsRejected("options-id", mockError)).toEqual(
      expectedAction
    );
  });
});
