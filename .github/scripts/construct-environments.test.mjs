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

test("dis-core: uses every DIS Core environment when inputs context is null", () => {
  const result = constructResult({
    mode: "dis-core",
    inputs: "null",
    allowEmpty: false,
  });

  assert.deepEqual(result, [
    { environment: "dis_core_at22", tag: "at22" },
    { environment: "dis_core_at23", tag: "at23" },
    { environment: "dis_core_yt01", tag: "yt01" },
    { environment: "dis_core_tt02", tag: "tt02" },
    { environment: "dis_core_prod", tag: "prod" },
  ]);
});

test("dis-core: resolves environments from inputs.environments", () => {
  const result = constructResult({
    mode: "dis-core",
    inputs: '{"environments":"tt02,prod"}',
    allowEmpty: false,
  });

  assert.deepEqual(result, [
    { environment: "dis_core_tt02", tag: "tt02" },
    { environment: "dis_core_prod", tag: "prod" },
  ]);
});

test("dis-core: rejects runtime rings", () => {
  assert.throws(
    () =>
      constructResult({
        mode: "dis-core",
        inputs: '{"environments":"at_ring1"}',
        allowEmpty: false,
      }),
    /invalid DIS Core environment 'at_ring1'/
  );
});

test("dis-core: rejects at24, which has no DIS Core cluster", () => {
  assert.throws(
    () =>
      constructResult({
        mode: "dis-core",
        inputs: '{"environments":"at23,at24"}',
        allowEmpty: false,
      }),
    /invalid DIS Core environment 'at24'/
  );
});

test("dis-core: rejects studio environments", () => {
  assert.throws(
    () =>
      constructResult({
        mode: "dis-core",
        inputs: '{"environments":"at22,dev"}',
        allowEmpty: false,
      }),
    /invalid DIS Core environment 'dev'/
  );
});

test("dis-core: empty string with allow-empty false throws", () => {
  assert.throws(
    () =>
      constructResult({
        mode: "dis-core",
        inputs: '{"environments":""}',
        allowEmpty: false,
      }),
    /cannot be empty/
  );
});

test("dis-core: empty string with allow-empty true returns []", () => {
  const result = constructResult({
    mode: "dis-core",
    inputs: '{"environments":""}',
    allowEmpty: true,
  });

  assert.deepEqual(result, []);
});

test("dis-core: ignores the runtime and studio default overrides in push context", () => {
  process.env.OVERRIDE_DEFAULT_RUNTIME_ENVIRONMENTS = "at_ring2";
  process.env.OVERRIDE_DEFAULT_STUDIO_ENVIRONMENTS = "dev";
  try {
    const result = constructResult({
      mode: "dis-core",
      inputs: "null",
      allowEmpty: false,
    });

    assert.equal(result.length, 5);
  } finally {
    delete process.env.OVERRIDE_DEFAULT_RUNTIME_ENVIRONMENTS;
    delete process.env.OVERRIDE_DEFAULT_STUDIO_ENVIRONMENTS;
  }
});

test("dis-core: resolves environments from the input named by inputsKey", () => {
  const result = constructResult({
    mode: "dis-core",
    inputs: '{"environments":"at_ring1","dis-core-environments":"at22,at23"}',
    inputsKey: "dis-core-environments",
    allowEmpty: false,
  });

  assert.deepEqual(result, [
    { environment: "dis_core_at22", tag: "at22" },
    { environment: "dis_core_at23", tag: "at23" },
  ]);
});

test("dis-core: inputsKey empty with allow-empty true returns []", () => {
  const result = constructResult({
    mode: "dis-core",
    inputs: '{"environments":"at_ring1","dis-core-environments":""}',
    inputsKey: "dis-core-environments",
    allowEmpty: true,
  });

  assert.deepEqual(result, []);
});

test("dis-core: inputsKey uses every DIS Core environment when inputs context is null", () => {
  const result = constructResult({
    mode: "dis-core",
    inputs: "null",
    inputsKey: "dis-core-environments",
    allowEmpty: true,
  });

  assert.equal(result.length, 5);
});

test("dis-core: inputsKey rejects a non-string value and names the key", () => {
  assert.throws(
    () =>
      constructResult({
        mode: "dis-core",
        inputs: '{"dis-core-environments":["at22"]}',
        inputsKey: "dis-core-environments",
        allowEmpty: false,
      }),
    /input 'dis-core-environments' must be a string/
  );
});

test("dis-core: inputsKey does not fall back to the environments input", () => {
  assert.throws(
    () =>
      constructResult({
        mode: "dis-core",
        inputs: '{"environments":"at22"}',
        inputsKey: "dis-core-environments",
        allowEmpty: false,
      }),
    /cannot be empty/
  );
});

test("runtime: reads environments, not other inputs, without inputsKey", () => {
  const result = constructResult({
    mode: "runtime",
    inputs: '{"environments":"at_ring1","dis-core-environments":"at22"}',
    allowEmpty: false,
  });

  assert.deepEqual(result, [{ ring: "at_ring1", environment: "runtime_at_ring1" }]);
});

test("rejects an empty inputsKey", () => {
  assert.throws(
    () =>
      constructResult({
        mode: "dis-core",
        inputs: '{"environments":"at22"}',
        inputsKey: "",
        allowEmpty: false,
      }),
    /inputs-key cannot be empty/
  );
});

test("dis-edge: uses every DIS Edge environment when inputs context is null", () => {
  const result = constructResult({
    mode: "dis-edge",
    inputs: "null",
    allowEmpty: false,
  });

  assert.deepEqual(result, [
    { environment: "dis_edge_at22", tag: "at22" },
    { environment: "dis_edge_at23", tag: "at23" },
    { environment: "dis_edge_yt01", tag: "yt01" },
    { environment: "dis_edge_tt02", tag: "tt02" },
    { environment: "dis_edge_prod", tag: "prod" },
  ]);
});

test("dis-edge: resolves environments from inputs.environments", () => {
  const result = constructResult({
    mode: "dis-edge",
    inputs: '{"environments":"at22,prod"}',
    allowEmpty: false,
  });

  assert.deepEqual(result, [
    { environment: "dis_edge_at22", tag: "at22" },
    { environment: "dis_edge_prod", tag: "prod" },
  ]);
});

test("dis-edge: rejects at24, whose relay uses tt02's DIS Edge", () => {
  assert.throws(
    () =>
      constructResult({
        mode: "dis-edge",
        inputs: '{"environments":"at24"}',
        allowEmpty: false,
      }),
    /invalid DIS Edge environment 'at24'/
  );
});
