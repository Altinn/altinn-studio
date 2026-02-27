import { pathToFileURL } from "node:url";

const VALID_MODES = new Set(["studio", "studio-preapproved", "runtime"]);
const DEFAULTS_BY_MODE = {
  "studio": "dev,staging,prod",
  "studio-preapproved": "dev,staging,preapproved-prod",
  "runtime": "at_ring1,at_ring2,tt_ring1,tt_ring2,prod_ring1,prod_ring2",
};
const OVERRIDE_DEFAULT_ENV_BY_MODE = {
  "studio": "OVERRIDE_DEFAULT_STUDIO_ENVIRONMENTS",
  "studio-preapproved": "OVERRIDE_DEFAULT_STUDIO_ENVIRONMENTS",
  "runtime": "OVERRIDE_DEFAULT_RUNTIME_ENVIRONMENTS",
};
const ALLOWED_VALUES_BY_MODE = {
  "studio": new Set(DEFAULTS_BY_MODE["studio"].split(",").map((value) => value.trim())),
  "studio-preapproved": new Set(
    DEFAULTS_BY_MODE["studio-preapproved"].split(",").map((value) => value.trim())
  ),
  "runtime": new Set(DEFAULTS_BY_MODE["runtime"].split(",").map((value) => value.trim())),
};

/**
 * Construct parsed output for studio or runtime environment inputs.
 * @param {{mode: string, inputs?: string, allowEmpty?: boolean|string}} input
 * @returns {Array<{environment: string, ring?: string}>}
 */
export function constructResult(input) {
  const mode = input.mode;
  if (!VALID_MODES.has(mode)) {
    throw new Error("mode must be 'studio', 'studio-preapproved', or 'runtime'.");
  }

  const allowEmpty = parseBool(input.allowEmpty);
  const inputs = input.inputs ?? "null";
  const parsedInputs = parseInputs(inputs);
  let raw = "";

  if (raw === "" && parsedInputs !== null) {
    raw = getEnvironmentsFromInputs(parsedInputs);
  }

  // No workflow_dispatch inputs context (e.g. push) with no explicit value/input:
  // use override when present, otherwise mode defaults.
  if (raw === "" && parsedInputs === null) {
    raw = getDefaultOverrideValue(mode) || DEFAULTS_BY_MODE[mode];
  }

  if (raw === "") {
    if (allowEmpty) {
      return [];
    }
    throw new Error("input cannot be empty when allow-empty=false.");
  }

  const values = splitCsvStrict(raw);
  const allowedValues = ALLOWED_VALUES_BY_MODE[mode];
  switch (mode) {
    case "studio":
    case "studio-preapproved":
      validateValues(values, allowedValues, "studio environment");
      return values.map((environment) => ({ environment }));
    case "runtime":
      validateValues(values, allowedValues, "runtime ring");
      return values.map((ring) => ({ ring, environment: `runtime_${ring}` }));
    default:
      throw new Error("unreachable mode.");
  }
}

/**
 * @param {string} inputs
 * @returns {Record<string, unknown> | null}
 */
function parseInputs(inputs) {
  if (inputs === "null") {
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(inputs);
  } catch {
    throw new Error("inputs must be valid JSON.");
  }

  if (parsed === null) {
    return null;
  }

  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("inputs must be an object or null.");
  }

  return parsed;
}

/**
 * @param {Record<string, unknown>} parsedInputs
 * @returns {string}
 */
function getEnvironmentsFromInputs(parsedInputs) {
  if (!("environments" in parsedInputs)) {
    return "";
  }

  const value = parsedInputs.environments;
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value !== "string") {
    throw new Error("input 'environments' must be a string.");
  }
  return value;
}

/**
 * @param {string} raw
 * @returns {string[]}
 */
function splitCsvStrict(raw) {
  const tokens = raw.split(",").map((token) => token.trim());
  if (tokens.some((token) => token.length === 0)) {
    throw new Error("input contains empty values.");
  }
  return tokens;
}

/**
 * @param {string[]} values
 * @param {Set<string>} allowed
 * @param {string} label
 */
function validateValues(values, allowed, label) {
  for (const value of values) {
    if (!allowed.has(value)) {
      throw new Error(`invalid ${label} '${value}'.`);
    }
  }
}

/**
 * @param {boolean|string|undefined} value
 * @returns {boolean}
 */
function parseBool(value) {
  if (typeof value === "boolean") {
    return value;
  }
  return String(value).toLowerCase() === "true";
}

/**
 * @param {"studio"|"studio-preapproved"|"runtime"} mode
 * @returns {string}
 */
function getDefaultOverrideValue(mode) {
  return (process.env[OVERRIDE_DEFAULT_ENV_BY_MODE[mode]] ?? "").trim();
}

/**
 * @param {string[]} argv
 * @returns {{mode: string, inputs: string, allowEmpty: string}}
 */
function parseArgs(argv) {
  const args = {
    mode: "",
    inputs: "null",
    allowEmpty: "false",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const next = argv[i + 1];
    if (!key.startsWith("--")) {
      throw new Error(`unexpected argument '${key}'.`);
    }
    if (next === undefined || next.startsWith("--")) {
      throw new Error(`missing value for '${key}'.`);
    }

    switch (key) {
      case "--mode":
        args.mode = next;
        break;
      case "--inputs":
        args.inputs = next;
        break;
      case "--allow-empty":
        args.allowEmpty = next;
        break;
      default:
        throw new Error(`unknown argument '${key}'.`);
    }
    i += 1;
  }

  return args;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = constructResult({
      mode: args.mode,
      inputs: args.inputs,
      allowEmpty: args.allowEmpty,
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
