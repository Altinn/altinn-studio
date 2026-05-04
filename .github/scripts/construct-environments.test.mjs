import test from "node:test";
import assert from "node:assert/strict";

import { constructResult } from "./construct-environments.mjs";

test("studio: uses defaults when inputs context is null", () => {
  const result = constructResult({
    mode: "studio",
    inputs: "null",
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
    inputs: "{}",
    allowEmpty: true,
  });

  assert.deepEqual(result, []);
});

test("studio: resolves environments from inputs.environments", () => {
  const result = constructResult({
    mode: "studio",
    inputs: '{"environments":"dev,staging"}',
    allowEmpty: false,
  });

  assert.deepEqual(result, [{ environment: "dev" }, { environment: "staging" }]);
});

test("studio: rejects preapproved-prod", () => {
  assert.throws(
    () =>
      constructResult({
        mode: "studio",
        inputs: '{"environments":"staging,preapproved-prod"}',
        allowEmpty: false,
      }),
    /invalid studio environment/
  );
});

test("studio: rejects empty token", () => {
  assert.throws(
    () =>
      constructResult({
        mode: "studio",
        inputs: '{"environments":"dev,,prod"}',
        allowEmpty: false,
      }),
    /empty values/
  );
});

test("runtime: maps rings to runtime environments", () => {
  const result = constructResult({
    mode: "runtime",
    inputs: '{"environments":"at_ring1,tt_ring2"}',
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
    inputs: "{}",
    allowEmpty: true,
  });

  assert.deepEqual(result, []);
});

test("runtime: rejects json array input", () => {
  assert.throws(
    () =>
      constructResult({
        mode: "runtime",
        inputs: '{"environments":"[{\\"ring\\":\\"at_ring1\\"}]"}',
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
        inputs: '{"environments":"[]"}',
        allowEmpty: true,
      }),
    /invalid runtime ring/
  );
});

test("runtime: rejects invalid environment token", () => {
  assert.throws(
    () =>
      constructResult({
        mode: "runtime",
        inputs: '{"environments":"AT_RING1"}',
        allowEmpty: false,
      }),
    /invalid runtime ring/
  );
});

test("runtime: rejects non-string ring input in inputs", () => {
  assert.throws(
    () =>
      constructResult({
        mode: "runtime",
        inputs: '{"environments":["at_ring1"]}',
        allowEmpty: false,
      }),
    /must be a string/
  );
});

test("runtime: uses defaults when inputs context is null", () => {
  const result = constructResult({
    mode: "runtime",
    inputs: "null",
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

test("studio-preapproved: uses defaults when inputs context is null", () => {
  const result = constructResult({
    mode: "studio-preapproved",
    inputs: "null",
    allowEmpty: false,
  });

  assert.deepEqual(result, [
    { environment: "dev" },
    { environment: "staging" },
    { environment: "preapproved-prod" },
  ]);
});

test("studio-preapproved: rejects prod", () => {
  assert.throws(
    () =>
      constructResult({
        mode: "studio-preapproved",
        inputs: '{"environments":"prod"}',
        allowEmpty: false,
      }),
    /invalid studio environment/
  );
});

test("studio: uses OVERRIDE_DEFAULT_STUDIO_ENVIRONMENTS in push context", () => {
  process.env.OVERRIDE_DEFAULT_STUDIO_ENVIRONMENTS = "dev";
  try {
    const result = constructResult({
      mode: "studio",
      inputs: "null",
      allowEmpty: false,
    });

    assert.deepEqual(result, [{ environment: "dev" }]);
  } finally {
    delete process.env.OVERRIDE_DEFAULT_STUDIO_ENVIRONMENTS;
  }
});

test("studio-preapproved: uses OVERRIDE_DEFAULT_STUDIO_ENVIRONMENTS in push context", () => {
  process.env.OVERRIDE_DEFAULT_STUDIO_ENVIRONMENTS = "preapproved-prod";
  try {
    const result = constructResult({
      mode: "studio-preapproved",
      inputs: "null",
      allowEmpty: false,
    });

    assert.deepEqual(result, [{ environment: "preapproved-prod" }]);
  } finally {
    delete process.env.OVERRIDE_DEFAULT_STUDIO_ENVIRONMENTS;
  }
});

test("runtime: uses OVERRIDE_DEFAULT_RUNTIME_ENVIRONMENTS in push context", () => {
  process.env.OVERRIDE_DEFAULT_RUNTIME_ENVIRONMENTS = "at_ring1";
  try {
    const result = constructResult({
      mode: "runtime",
      inputs: "null",
      allowEmpty: false,
    });

    assert.deepEqual(result, [{ ring: "at_ring1", environment: "runtime_at_ring1" }]);
  } finally {
    delete process.env.OVERRIDE_DEFAULT_RUNTIME_ENVIRONMENTS;
  }
});

test("studio: explicit environments input takes precedence over default override", () => {
  process.env.OVERRIDE_DEFAULT_STUDIO_ENVIRONMENTS = "prod";
  try {
    const result = constructResult({
      mode: "studio",
      inputs: '{"environments":"dev"}',
      allowEmpty: false,
    });

    assert.deepEqual(result, [{ environment: "dev" }]);
  } finally {
    delete process.env.OVERRIDE_DEFAULT_STUDIO_ENVIRONMENTS;
  }
});

test("runtime: explicit environments input takes precedence over default override", () => {
  process.env.OVERRIDE_DEFAULT_RUNTIME_ENVIRONMENTS = "tt_ring1,tt_ring2";
  try {
    const result = constructResult({
      mode: "runtime",
      inputs: '{"environments":"at_ring1"}',
      allowEmpty: false,
    });

    assert.deepEqual(result, [{ ring: "at_ring1", environment: "runtime_at_ring1" }]);
  } finally {
    delete process.env.OVERRIDE_DEFAULT_RUNTIME_ENVIRONMENTS;
  }
});
