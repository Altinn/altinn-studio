import test from "node:test";
import assert from "node:assert/strict";

import { constructResult } from "./construct-environments.mjs";

test("studio: uses defaults when inputs context is null", () => {
  const result = constructResult({
    mode: "studio",
    value: "",
    inputsJson: "null",
    allowEmpty: false,
  });

  assert.deepEqual(result, [
    { environment: "dev" },
    { environment: "staging" },
    { environment: "prod" },
  ]);
});

test("studio: empty with allow-empty true returns []", () => {
  const result = constructResult({
    mode: "studio",
    value: "",
    inputsJson: "{}",
    allowEmpty: true,
  });

  assert.deepEqual(result, []);
});

test("studio: rejects empty token", () => {
  assert.throws(
    () =>
      constructResult({
        mode: "studio",
        value: "dev,,prod",
        inputsJson: "{}",
        allowEmpty: false,
      }),
    /empty values/
  );
});

test("runtime: maps rings to runtime environments", () => {
  const result = constructResult({
    mode: "runtime",
    value: "at_ring1,tt_ring2",
    inputsJson: "{}",
    allowEmpty: false,
  });

  assert.deepEqual(result, [
    { ring: "at_ring1", environment: "runtime_at_ring1" },
    { ring: "tt_ring2", environment: "runtime_tt_ring2" },
  ]);
});

test("runtime: empty string with allow-empty true returns []", () => {
  const result = constructResult({
    mode: "runtime",
    value: "",
    inputsJson: "{}",
    allowEmpty: true,
  });

  assert.deepEqual(result, []);
});

test("runtime: rejects json array input", () => {
  assert.throws(
    () =>
      constructResult({
        mode: "runtime",
        value: '[{"ring":"at_ring1"}]',
        inputsJson: "{}",
        allowEmpty: false,
      }),
    /invalid runtime ring/
  );
});

test("runtime: rejects empty json array input", () => {
  assert.throws(
    () =>
      constructResult({
        mode: "runtime",
        value: "[]",
        inputsJson: "{}",
        allowEmpty: true,
      }),
    /invalid runtime ring/
  );
});

test("runtime: rejects invalid env value", () => {
  assert.throws(
    () =>
      constructResult({
        mode: "runtime",
        value: "AT_RING1",
        inputsJson: "{}",
        allowEmpty: false,
      }),
    /invalid runtime ring/
  );
});

test("runtime: uses defaults when inputs context is null", () => {
  const result = constructResult({
    mode: "runtime",
    value: "",
    inputsJson: "null",
    allowEmpty: false,
  });

  assert.deepEqual(result, [
    { ring: "at_ring1", environment: "runtime_at_ring1" },
    { ring: "at_ring2", environment: "runtime_at_ring2" },
    { ring: "tt_ring1", environment: "runtime_tt_ring1" },
    { ring: "tt_ring2", environment: "runtime_tt_ring2" },
    { ring: "prod_ring1", environment: "runtime_prod_ring1" },
    { ring: "prod_ring2", environment: "runtime_prod_ring2" },
  ]);
});

test("studio: uses OVERRIDE_STUDIO_ENVIRONMENTS in push context", () => {
  process.env.OVERRIDE_STUDIO_ENVIRONMENTS = "dev";
  try {
    const result = constructResult({
      mode: "studio",
      value: "",
      inputsJson: "null",
      allowEmpty: false,
    });

    assert.deepEqual(result, [{ environment: "dev" }]);
  } finally {
    delete process.env.OVERRIDE_STUDIO_ENVIRONMENTS;
  }
});

test("runtime: uses OVERRIDE_RUNTIME_RINGS in push context", () => {
  process.env.OVERRIDE_RUNTIME_RINGS = "at_ring1";
  try {
    const result = constructResult({
      mode: "runtime",
      value: "",
      inputsJson: "null",
      allowEmpty: false,
    });

    assert.deepEqual(result, [{ ring: "at_ring1", environment: "runtime_at_ring1" }]);
  } finally {
    delete process.env.OVERRIDE_RUNTIME_RINGS;
  }
});
