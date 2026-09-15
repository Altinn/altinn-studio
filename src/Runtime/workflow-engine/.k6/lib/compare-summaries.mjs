#!/usr/bin/env node
// Compares two arms of mailbox-storm runs and applies the acceptance gates.
//
// Usage: node compare-summaries.mjs [--ungate-latency] <reference.json[,…]> <candidate.json[,…]>
//
// Verdicts are three-valued: `pass`, `FAIL`, and exit-neutral `inconclusive`, which can never read `pass`.
// Gates are two-sided (the arms are built to do the same work, so materially faster fails too), and the
// tolerance is TOLERANCE_K standard errors of the *reference* arm's mean — never the candidate's, so an
// unstable candidate cannot widen its own gate.

import { readFileSync } from 'node:fs';

// The minimum that measures anything; n=2 is a looser gate than n=3 under the standard-error tolerance.
const MIN_REPEATS_TO_GATE = 2;
const MAX_ERROR_RATE = 0.01;

// Candidate spread beyond this multiple of the reference's reads inconclusive rather than passed.
const MAX_SPREAD_RATIO = Number(process.env.MAX_SPREAD_RATIO ?? 2);

// Floor for the spread test: backlog p95 is effectively integer-valued, so a reference landing on 3.0
// three times has spread 0 and the ratio ceiling would collapse.
const SPREAD_RESOLUTION_FLOOR = 2;

// Range → σ: E[range] = d₂(n)·σ (Shewhart). Larger arms reuse d₂(10), erring toward a looser gate.
const D2 = {
    2: 1.128,
    3: 1.693,
    4: 2.059,
    5: 2.326,
    6: 2.534,
    7: 2.704,
    8: 2.847,
    9: 2.97,
    10: 3.078,
};

// SD of the range in units of σ (d₃); only reports how uncertain the tolerance itself is.
const D3 = {
    2: 0.853,
    3: 0.888,
    4: 0.88,
    5: 0.864,
    6: 0.848,
    7: 0.833,
    8: 0.82,
    9: 0.808,
    10: 0.797,
};

// k=3 is zero-regret at n=3 (1.023·range) and tightens as √n from there.
const TOLERANCE_K = Number(process.env.TOLERANCE_K ?? 3);

// A gate coarser than this fraction of the reference mean is not evidence of anything.
const TARGET_SENSITIVITY = Number(process.env.TARGET_SENSITIVITY ?? 0.1);

// --- The recorded price ------------------------------------------------------------------------
//
// Where a cost is measured and written down, the gate measures departures from it rather than from zero.
// `fractions` is empty by decision: the step-11 sessions agreed on sign but put p95 at +10.7% vs +5.0%, so
// this suite reports FAIL on `enqueue.med`/`enqueue.p95` until a second session reproduces a size.
// `EXPECTATIONS=off` gates every metric against zero, which is how a future price is re-derived.
const EXPECTATIONS_ON = (process.env.EXPECTATIONS ?? 'on') !== 'off';

const RECORDED_PRICE = {
    measuredOn: '2026-08-20',
    revision: 'commit "workflow-engine: mailbox step 11 — mailbox-storm measurement"',
    machine:
        '7-vCPU podman VM on a 14-core Mac, EngineSettings.Concurrency.MaxWorkers 10, engine and Postgres side by side',
    repeats: 5,
    duration: '3m',
    confirmedBy:
        'a second session (3 × 3m, same machine) measured the p95 cost at +5.0% against the first ' +
        "session's +10.7% — the sign reproduced, the size did not, which is why nothing is recorded",
    config: {
        baselineRate: 200,
        exchangeRate: 25,
        messagesPerExchange: 2,
        bufferRate: 25,
        earlyRate: 5,
        deliveryPayloadBytes: 2048,
    },
    receiverRate: 55.0,
    receiverRateTolerance: 0.1,
    // The machine guard: a faster machine shrinks queuing costs, so the operating point rides along.
    referenceP95Ms: 2.64,
    referenceP95Tolerance: 0.25,
    // Empty by measurement — see above.
    fractions: {
        webhook: {},
        inproc: {},
    },
    unpriced: {},

    // The ceiling: a cost established in sign, unresolved in size. Inside it a metric reads `inconclusive`
    // — never `pass` — and outside it FAILs, which keeps the gate falsifiable. Replace with a `fractions`
    // entry the moment a third session pins a size.
    costEstablishedUnresolved: {
        webhook: { 'enqueue.med': 0.028, 'enqueue.p95': 0.107 },
        inproc: {},
    },
    costSessions: 'session A +2.8% med / +10.7% p95, session B +1.2% med / +5.0% p95',
};

const argv = process.argv.slice(2);
const ungateLatency = argv.includes('--ungate-latency');
const [referenceArg, candidateArg] = argv.filter((a) => !a.startsWith('--'));
if (!referenceArg || !candidateArg) {
    console.error(
        'usage: node compare-summaries.mjs [--ungate-latency] <reference.json[,…]> <candidate.json[,…]>',
    );
    process.exit(2);
}

const load = (arg) =>
    arg
        .split(',')
        .filter(Boolean)
        .map((path) => ({ path, summary: JSON.parse(readFileSync(path, 'utf8')) }));

const reference = load(referenceArg);
const candidate = load(candidateArg);
const referenceMode = reference[0].summary.mode ?? 'reference';
const candidateMode = candidate[0].summary.mode ?? 'candidate';

const rows = [];
let failures = 0;
let inconclusive = 0;
// Counted apart so a REPEATS=1 session — where every difference metric reads `ungated` while the per-run
// assertions still pass — cannot print `pass`.
let comparisonPasses = 0;
let assertionPasses = 0;
// Inconclusive routes are counted separately because the remedies differ (REPEATS vs DURATION).
let inconclusiveSpread = 0;
let inconclusiveSensitivity = 0;
// Third route: the price does not cover this operating point.
let inconclusivePrice = 0;
// Fourth route: inside the ceiling of a cost established in sign but not size.
let inconclusiveCeiling = 0;

const mean = (values) => values.reduce((sum, v) => sum + v, 0) / values.length;
const spread = (values) => (values.length < 2 ? 0 : Math.max(...values) - Math.min(...values));

// --- Which comparison is this, and does the recorded price apply to it? -------------------------
const gatingComparison = referenceMode === 'control' && candidateMode === 'storm';
const stormRunConfig = candidate.find((r) => r.summary.mode === 'storm')?.summary.config ?? {};
const referenceControlShape = reference.find((r) => r.summary.mode === 'control')?.summary.config
    ?.controlShape;
const achievedReceiverRates = candidate
    .filter((r) => r.summary.mode === 'storm')
    .map((r) => r.summary.receivers?.enqueuedRate)
    .filter((v) => typeof v === 'number' && v > 0);

/** Pulls one number out of a summary, by dotted path. */
const pick = (summary, path) => path.split('.').reduce((node, key) => node?.[key], summary);

/** Why the recorded price does not apply here, or null when it does. */
function priceInapplicableReason() {
    if (!EXPECTATIONS_ON) return 'EXPECTATIONS=off';
    if (!gatingComparison) return 'not the gating control-vs-storm comparison';
    if (!referenceControlShape) return 'the control arm does not report its shape';
    if (!RECORDED_PRICE.fractions[referenceControlShape])
        return `no price recorded for a '${referenceControlShape}'-shaped control`;

    for (const [key, recorded] of Object.entries(RECORDED_PRICE.config)) {
        if (stormRunConfig[key] !== recorded) {
            return `configuration differs from the recorded one (${key}=${stormRunConfig[key]}, recorded ${recorded})`;
        }
    }

    if (achievedReceiverRates.length === 0)
        return 'the storm arm reports no achieved receiver rate';
    const drift =
        Math.abs(mean(achievedReceiverRates) - RECORDED_PRICE.receiverRate) /
        RECORDED_PRICE.receiverRate;
    if (drift > RECORDED_PRICE.receiverRateTolerance) {
        return `achieved ${fmt(mean(achievedReceiverRates), 1)} receivers/s against the recorded ${RECORDED_PRICE.receiverRate}/s (${fmt(drift * 100, 0)}% apart)`;
    }

    const referenceP95 = reference
        .map((r) => pick(r.summary, 'enqueue.p95'))
        .filter((v) => typeof v === 'number');
    if (referenceP95.length > 0) {
        const machineDrift =
            Math.abs(mean(referenceP95) - RECORDED_PRICE.referenceP95Ms) /
            RECORDED_PRICE.referenceP95Ms;
        if (machineDrift > RECORDED_PRICE.referenceP95Tolerance) {
            return (
                `this session's ${referenceMode} arm sits at ${fmt(mean(referenceP95))} ms p95 against the ` +
                `${fmt(RECORDED_PRICE.referenceP95Ms)} ms the price was recorded at (${fmt(machineDrift * 100, 0)}% apart) — ` +
                `different hardware or a different utilization point, where a queuing cost does not carry over`
            );
        }
    }

    return null;
}

/** Standard error of the mean, with σ estimated from the sample range via d₂. */
const standardError = (values) => {
    const n = values.length;
    if (n < 2) return 0;
    return spread(values) / (D2[Math.min(n, 10)] ?? D2[10]) / Math.sqrt(n);
};

/** How uncertain a range-derived tolerance is, as a fraction of itself: SD(range)/E(range) = d₃/d₂. */
const toleranceUncertainty = (n) => {
    const size = Math.min(Math.max(n, 2), 10);
    return D3[size] / D2[size];
};

const fmt = (value, digits = 2) =>
    value === undefined || value === null || Number.isNaN(value)
        ? '—'
        : Number(value).toFixed(digits);

function record(name, left, right, limit, verdict, note, kind = 'comparison') {
    if (verdict === 'FAIL') failures++;
    if (verdict === 'inconclusive') inconclusive++;
    if (verdict === 'pass' && kind === 'comparison') comparisonPasses++;
    if (verdict === 'pass' && kind === 'assertion') assertionPasses++;
    rows.push({ name, left, right, limit, verdict, note });
}

const priceReason = priceInapplicableReason();

/**
 * The expected difference in the metric's own units — the recorded price scaled onto this reference mean,
 * or zero. `fallback` marks a price this run does not qualify for, which the verdict note must say.
 */
function expectationFor(path, referenceMean) {
    const recorded = RECORDED_PRICE.fractions[referenceControlShape ?? '']?.[path];

    if (priceReason !== null) {
        return {
            value: 0,
            fraction: null,
            fallback: recorded !== undefined ? priceReason : null,
            // `EXPECTATIONS=off` is a deliberate request to gate against zero, so a difference there is a finding.
            explicitZero: priceReason === 'EXPECTATIONS=off',
        };
    }

    if (recorded === undefined) {
        // No price by design: these are the metrics measured at zero.
        return { value: 0, fraction: null, fallback: null };
    }

    return { value: recorded * referenceMean, fraction: recorded, fallback: null };
}

/**
 * The ceiling for a metric, or null. One-sided — a materially cheaper candidate is not this cost but the
 * arms failing to be comparable, and must keep reading `FAIL — storm is BETTER`. A price supersedes it.
 */
function ceilingFor(path, referenceMean) {
    if (priceReason !== null) return null;
    const shape = referenceControlShape ?? '';
    if (RECORDED_PRICE.fractions[shape]?.[path] !== undefined) return null;
    const fraction = RECORDED_PRICE.costEstablishedUnresolved[shape]?.[path];
    if (fraction === undefined) return null;
    return { fraction, value: fraction * Math.abs(referenceMean) };
}

/**
 * Compares one metric and assigns a three-valued verdict. The tolerance is TOLERANCE_K standard errors of
 * the reference mean, floored at the metric's measurement resolution; the candidate's spread never widens
 * its own gate.
 */
function compareArms(
    name,
    path,
    {
        digits = 2,
        resolution = 0,
        gated: gatedMetric = true,
        sensitivityTarget = TARGET_SENSITIVITY,
    } = {},
) {
    const left = reference.map((r) => pick(r.summary, path)).filter((v) => typeof v === 'number');
    const right = candidate.map((r) => pick(r.summary, path)).filter((v) => typeof v === 'number');

    if (left.length === 0 || right.length === 0) {
        record(name, '—', '—', '—', 'FAIL', 'metric missing from summaries');
        return;
    }

    const referenceSpread = spread(left);
    const candidateSpread = spread(right);
    const meanDifference = mean(right) - mean(left);
    const expectation = expectationFor(path, mean(left));
    const deviation = meanDifference - expectation.value;
    const tolerance = Math.max(TOLERANCE_K * standardError(left), resolution);
    // The escalation floor keeps an unstable arm falsifiable: a regression that added tail variance cannot
    // hide behind the spread check when the difference exceeds both arms' combined uncertainty.
    const escalationTolerance = Math.max(
        TOLERANCE_K * Math.hypot(standardError(left), standardError(right)),
        resolution,
    );
    const ceiling = gatedMetric ? ceilingFor(path, mean(left)) : null;
    const sensitivity = tolerance / Math.abs(mean(left) || 1);
    const enoughRepeats = Math.min(left.length, right.length) >= MIN_REPEATS_TO_GATE;
    const spreadCeiling = Math.max(
        MAX_SPREAD_RATIO * referenceSpread,
        SPREAD_RESOLUTION_FLOOR * resolution,
    );

    let verdict;
    let why = '';
    if (!enoughRepeats) {
        verdict = 'ungated';
        why = ` (needs ${MIN_REPEATS_TO_GATE}+ repeats per arm)`;
    } else if (!gatedMetric) {
        verdict = 'ungated';
        why = ' (informational for this comparison)';
    } else if (candidateSpread > spreadCeiling && Math.abs(deviation) <= escalationTolerance) {
        // Did not reproduce AND the difference is small enough that noise could account for it.
        verdict = 'inconclusive';
        inconclusiveSpread++;
        why =
            ` — ${candidateMode} spread ${fmt(candidateSpread, digits)} is over the ceiling ` +
            `${fmt(spreadCeiling, digits)} (${MAX_SPREAD_RATIO}× ${referenceMode}'s ${fmt(referenceSpread, digits)}, ` +
            `floored at ${SPREAD_RESOLUTION_FLOOR}× the ${fmt(resolution, digits)} resolution); that arm did not ` +
            `reproduce, and Δ−price ${fmt(deviation, digits)} is inside the ${fmt(escalationTolerance, digits)} both-arms ` +
            `uncertainty, so nothing here can be concluded either way`;
    } else if (
        Math.abs(deviation) > tolerance &&
        expectation.fallback &&
        !expectation.explicitZero
    ) {
        // A price exists for this metric but not for this run's operating point.
        verdict = 'inconclusive';
        inconclusivePrice++;
        why =
            ` — a price IS recorded for this metric but does not apply here (${expectation.fallback}), so a ` +
            `difference of ${fmt(deviation, digits)} cannot be told apart from the known cost at this operating ` +
            `point. Re-run at the recorded configuration, or re-derive the price for this one (the derivation ` +
            `line below prints what this session would record)`;
    } else if (
        deviation > tolerance &&
        ceiling !== null &&
        deviation <= ceiling.value + tolerance
    ) {
        // Dearer than the tolerance, but inside a cost these sessions established without sizing.
        verdict = 'inconclusive';
        inconclusiveCeiling++;
        why =
            ` — dearer by ${fmt(deviation, digits)}, inside the ${fmt(ceiling.value, digits)} ceiling ` +
            `(${fmt(ceiling.fraction * 100, 1)}% of ${referenceMode}) these sessions established: ` +
            `${RECORDED_PRICE.costSessions}. The cost is real and its size is not, so this reads as ` +
            `unresolved rather than as a regression; a third session that agrees on a size turns the ` +
            `ceiling into a price. Anything past ${fmt(ceiling.value + tolerance, digits)} fails.`;
    } else if (Math.abs(deviation) > tolerance) {
        verdict = 'FAIL';
        // Every gated metric here is lower-is-better, so the direction is read straight off the sign.
        const better = deviation < 0;
        if (expectation.value !== 0) {
            why = better
                ? ` — ${fmt(Math.abs(deviation), digits)} CHEAPER than the recorded price of ` +
                  `${fmt(expectation.value, digits)}. Two-sided on purpose: the price is a measurement, so ` +
                  `beating it by more than this session's own uncertainty means something changed — a faster ` +
                  `path, a different build, or an arm that did less work than it claims. Confirm with ` +
                  `EXPECTATIONS=off, then re-record the price if it really is cheaper now`
                : ` — ${fmt(deviation, digits)} DEARER than the recorded price of ${fmt(expectation.value, digits)}: ` +
                  `a regression on top of the known cost`;
        } else {
            why = better
                ? ` — ${candidateMode} is BETTER than ${referenceMode} by more than ${referenceMode}'s own ` +
                  `uncertainty. Two-sided on purpose: the arms are meant to do the same amount of work, so ` +
                  `this says the premise is broken (check control arm provisioning / impliedControlRate, and ` +
                  `that both arms ran the same build), not that the feature made the engine faster`
                : ` — ${candidateMode} is worse by more than ${referenceMode}'s own uncertainty`;
        }
        if (ceiling !== null && deviation > ceiling.value + tolerance) {
            why +=
                `. PAST THE CEILING: these sessions established a cost of at most ${fmt(ceiling.value, digits)} ` +
                `(${fmt(ceiling.fraction * 100, 1)}% of ${referenceMode}) and this exceeds it by ` +
                `${fmt(deviation - ceiling.value - tolerance, digits)} beyond the tolerance, so it is a new cost ` +
                `rather than the known one`;
        }
        if (candidateSpread > spreadCeiling) {
            why +=
                `. ESCALATED: the ${candidateMode} arm did not reproduce (spread ${fmt(candidateSpread, digits)} over the ` +
                `${fmt(spreadCeiling, digits)} ceiling), but ${fmt(Math.abs(deviation), digits)} is larger than the ` +
                `${fmt(escalationTolerance, digits)} both-arms uncertainty can explain, so this fails rather than abstains`;
        }
        if (expectation.fallback) {
            why +=
                `. NOTE: a price IS recorded for this metric but does not apply here — ${expectation.fallback} — ` +
                `so this is gated against zero and a known cost reads as a failure`;
        }
    } else if (sensitivityTarget !== null && sensitivity > sensitivityTarget) {
        // Inside the tolerance, but the tolerance is too coarse to mean anything.
        verdict = 'inconclusive';
        inconclusiveSensitivity++;
        why = ` — gate resolves only ${fmt(sensitivity * 100, 1)}% of ${referenceMode}, target ${fmt(sensitivityTarget * 100, 0)}%`;
    } else {
        verdict = 'pass';
        // A coarse instrument passes honestly but weakly, and the note says so.
        if (sensitivityTarget === null && tolerance <= resolution) {
            why = ` — resolution-limited: only a shift over ${fmt(resolution, digits)} is visible`;
        }
    }

    const signed = (value) => `${value >= 0 ? '+' : ''}${fmt(value, digits)}`;
    // The raw Δ always leads, so a price stays visible rather than being absorbed into a pass.
    const priced =
        expectation.value !== 0
            ? ` (price ${signed(expectation.value)}, dev ${signed(deviation)})`
            : expectation.fallback
              ? ' (price recorded but not applicable here — see note)'
              : '';

    record(
        name,
        `${fmt(mean(left), digits)} ±${fmt(referenceSpread, digits)}`,
        `${fmt(mean(right), digits)} ±${fmt(candidateSpread, digits)}`,
        expectation.value !== 0
            ? `|Δ−${fmt(expectation.value, digits)}| ≤ ${fmt(tolerance, digits)}`
            : ceiling !== null
              ? `${fmt(tolerance, digits)} / ${fmt(ceiling.value + tolerance, digits)}`
              : `Δ ≤ ${fmt(tolerance, digits)}`,
        verdict,
        `Δ ${signed(meanDifference)}${priced}${why}`,
    );

    return { meanDifference, deviation, expectation, tolerance, sensitivity };
}

/** Per-run assertion that must hold in every run of both arms. */
function assertEveryRun(name, predicate, describe, note) {
    const offenders = [...reference, ...candidate].filter((r) => !predicate(r.summary));
    record(
        name,
        describe(reference),
        describe(candidate),
        'every run',
        offenders.length === 0 ? 'pass' : 'FAIL',
        offenders.length === 0
            ? note
            : `${offenders.length} run(s) failed: ${offenders.map((o) => o.path).join(' ')}`,
        'assertion',
    );
}

// Measurement resolutions, not budgets.
const LATENCY_RESOLUTION_MS = 0.05;
const BACKLOG_RESOLUTION_WORKFLOWS = 1;
const DRAIN_RESOLUTION_SECONDS = 1;

// --- Latency: the enqueue path, which mailbox traffic must not touch ---------------------------
// `--ungate-latency` is for comparisons where a latency difference is expected (storm vs plain baseline).
const latencyOptions = { resolution: LATENCY_RESOLUTION_MS, gated: !ungateLatency };
compareArms('enqueue med (ms)', 'enqueue.med', latencyOptions);
compareArms('enqueue p95 (ms)', 'enqueue.p95', latencyOptions);
compareArms('enqueue p99 (ms)', 'enqueue.p99', latencyOptions);

// --- Processing: backlog is what a throughput regression looks like from outside ---------------
// Gated even when latency is not; no sensitivity target, because the instruments are coarse by nature.
compareArms('engine backlog p95 (workflows)', 'backlog.p95', {
    digits: 1,
    resolution: BACKLOG_RESOLUTION_WORKFLOWS,
    sensitivityTarget: null,
});
compareArms('drain after load stops (s)', 'processing.drainSeconds', {
    resolution: DRAIN_RESOLUTION_SECONDS,
    sensitivityTarget: null,
});

assertEveryRun(
    'baseline workload completed',
    (s) =>
        s.processing.baselineCompleted >= s.enqueue.requests * 0.99 &&
        s.processing.baselineFailed === 0,
    (arm) => `${Math.min(...arm.map((r) => r.summary.processing.baselineCompleted))} min`,
    '≥ 99% of enqueued workflows completed, none failed',
);

assertEveryRun(
    'no dropped iterations',
    (s) => s.droppedIterations === 0,
    (arm) => `${Math.max(...arm.map((r) => r.summary.droppedIterations))} max`,
    'the generator held its arrival rate — which is also what makes the achieved enqueue rate uninteresting',
);

assertEveryRun(
    'enqueue error rate',
    (s) => s.enqueue.failedRate < MAX_ERROR_RATE,
    (arm) => fmt(Math.max(...arm.map((r) => r.summary.enqueue.failedRate)), 4),
    `< ${MAX_ERROR_RATE}`,
);

// The refusal that would prove the admission-budget interaction has teeth: Held receivers count toward
// the budget deliveries are exempt from.
assertEveryRun(
    'no ordinary enqueue refused at capacity',
    (s) => (s.enqueue.atCapacity ?? 0) === 0,
    (arm) => `${Math.max(...arm.map((r) => r.summary.enqueue.atCapacity ?? 0))} max`,
    '= 0 — a parked receiver consumes admission budget that delivery ingestion is exempt from, so a storm can in principle refuse ordinary enqueues',
);

// Ungated, and reported for exactly that reason: the number is what a mailbox costs the admission budget.
compareArms('engine active workflows (max)', 'engine.activeMax', {
    digits: 0,
    resolution: 1,
    gated: false,
    sensitivityTarget: null,
});

// --- The gate's premise: both arms gave the engine the same extra work — checked, not assumed ---
{
    const stormArm = [reference, candidate].flat().filter((r) => r.summary.mode === 'storm');
    const controlArm = [reference, candidate].flat().filter((r) => r.summary.mode === 'control');

    if (stormArm.length > 0 && controlArm.length > 0) {
        const implied = mean(stormArm.map((r) => r.summary.config.impliedControlRate ?? 0));
        const configured = mean(controlArm.map((r) => r.summary.config.controlRate ?? 0));
        const drift = Math.abs(configured - implied) / (implied || 1);

        record(
            'control arm provisioning',
            `${fmt(configured, 1)}/s configured`,
            `${fmt(implied, 1)}/s implied`,
            '≤ 5% apart',
            drift <= 0.05 ? 'pass' : 'FAIL',
            `${fmt(drift * 100, 1)}% off — the control arm must match the receive workflows the storm generates` +
                (drift > 0.05 ? `; set CONTROL_RATE=${Math.round(implied)}` : ''),
            // A premise check that holds at any repeat count, so it must not make a REPEATS=1 session read `pass`.
            'assertion',
        );
    }
}

// --- Fidelity: every gate above is satisfiable by a run whose deliveries went nowhere -----------
if (candidateMode === 'storm') {
    const config = candidate[0].summary.config;

    assertEveryRun(
        'deliveries accepted',
        (s) => s.mode !== 'storm' || s.deliveries.accepted > 0,
        (arm) => `${Math.min(...arm.map((r) => r.summary.deliveries.accepted ?? 0))} min`,
        'the storm actually stormed',
    );

    if (config.exchangeRate > 0) {
        const expected = config.exchangeRate * durationSeconds(config.duration) * 0.9;
        assertEveryRun(
            'relay exchanges started',
            (s) => s.mode !== 'storm' || s.exchanges.relayStarted >= expected,
            (arm) => `${Math.min(...arm.map((r) => r.summary.exchanges.relayStarted ?? 0))} min`,
            `≥ 90% of ${config.exchangeRate}/s × duration = ${Math.round(expected)}`,
        );

        // Completed requires a resolved rendezvous, so this is the end-to-end wake assertion.
        assertEveryRun(
            'parked receivers woken and completed',
            (s) =>
                s.mode !== 'storm' ||
                s.processing.relayCompleted >=
                    s.exchanges.relayStarted * config.messagesPerExchange * 0.9,
            (arm) => `${Math.min(...arm.map((r) => r.summary.processing.relayCompleted))} min`,
            '≥ 90% of the receivers enqueued reached Completed — the delivery woke them and their step ran',
        );

        // Sampled rather than universal: the enqueue response carries no status.
        assertEveryRun(
            'receivers born Held',
            (s) => s.mode !== 'storm' || (s.receivers.bornHeldRate ?? 0) >= 0.95,
            (arm) => fmt(Math.min(...arm.map((r) => r.summary.receivers.bornHeldRate ?? 0)), 3),
            '≥ 0.95 — a receiver enqueued before its message parked, which is the shape the relay arm tests',
        );

        assertEveryRun(
            'no relay receiver left parked',
            (s) => s.mode !== 'storm' || (s.processing.relayHeld ?? 0) === 0,
            (arm) => `${Math.max(...arm.map((r) => r.summary.processing.relayHeld ?? 0))} max`,
            '= 0 — a receiver still Held after the run settled is a lost wake, the one failure this design must not have',
        );
    }

    if (config.earlyRate > 0) {
        // The other interleaving: the message was already at the position, so the flush found `seq < next_idx`.
        assertEveryRun(
            'early-message receivers born runnable',
            (s) => s.mode !== 'storm' || (s.receivers.bornRunnableRate ?? 0) >= 0.95,
            (arm) => fmt(Math.min(...arm.map((r) => r.summary.receivers.bornRunnableRate ?? 0)), 3),
            '≥ 0.95 — a receiver enqueued after its message never parked',
        );

        assertEveryRun(
            'early-message receivers completed',
            (s) =>
                s.mode !== 'storm' || s.processing.earlyCompleted >= s.exchanges.earlyStarted * 0.9,
            (arm) => `${Math.min(...arm.map((r) => r.summary.processing.earlyCompleted))} min`,
            '≥ 90% — born runnable with the backlog delivery, and it ran',
        );
    }

    if (config.bufferRate > 0) {
        // Reaching the cap is the arm working; never filling one would be the failure.
        assertEveryRun(
            'a mailbox log reached the cap',
            (s) => s.mode !== 'storm' || (s.deliveries.logDepthMax ?? 0) >= 50,
            (arm) =>
                `${Math.min(...arm.map((r) => r.summary.deliveries.logDepthMax ?? 0))} min depth`,
            'the buffered arm actually filled a log (≥ 50 messages); 429s past the cap are the cap working',
        );

        // The claim under test: a buffered message creates no workflow.
        assertEveryRun(
            'buffered messages created no workflows',
            (s) =>
                s.mode !== 'storm' ||
                s.receivers.enqueued <=
                    s.exchanges.relayStarted * config.messagesPerExchange +
                        s.exchanges.earlyStarted,
            (arm) => `${Math.max(...arm.map((r) => r.summary.receivers.enqueued))} max`,
            'receivers enqueued ≤ what the relay and early arms account for — the buffered arm enqueued none',
        );
    }

    if (config.replayEvery > 0 && config.exchangeRate > 0) {
        // Replays are asserted to happen and to be deduplicated — posted after the close, so they also exercise
        // the rule that an idempotency hit outranks lateness.
        assertEveryRun(
            'replays deduplicated',
            (s) => s.mode !== 'storm' || (s.deliveries.replayed > 0 && s.deliveries.duplicate > 0),
            (arm) =>
                `${Math.min(...arm.map((r) => r.summary.deliveries.duplicate ?? 0))} min 200s / ` +
                `${Math.min(...arm.map((r) => r.summary.deliveries.replayed ?? 0))} replays`,
            'a re-posted idempotencyKey answers 200 with the original idx and appends no second row, even after the mailbox closed',
        );

        assertEveryRun(
            'replays cost no other status',
            (s) => s.mode !== 'storm' || s.deliveries.duplicate >= s.deliveries.replayed,
            (arm) =>
                `${Math.min(...arm.map((r) => (r.summary.deliveries.duplicate ?? 0) - (r.summary.deliveries.replayed ?? 0)))} min surplus`,
            'every replay was classified as a duplicate — none fell through to 409/413/other',
        );
    }

    assertEveryRun(
        'late deliveries (409)',
        (s) => s.mode !== 'storm' || s.deliveries.late409 === 0,
        (arm) => `${Math.max(...arm.map((r) => r.summary.deliveries.late409 ?? 0))} max`,
        '= 0 — a mailbox closed early makes every later delivery to it a silent 409',
    );

    assertEveryRun(
        'unroutable deliveries (404)',
        (s) => s.mode !== 'storm' || s.deliveries.unroutable404 === 0,
        (arm) => `${Math.max(...arm.map((r) => r.summary.deliveries.unroutable404 ?? 0))} max`,
        '= 0 — addressing held up',
    );

    assertEveryRun(
        'unexpected delivery statuses',
        (s) => s.mode !== 'storm' || s.deliveries.other + s.deliveries.tooLarge413 === 0,
        (arm) =>
            `${Math.max(...arm.map((r) => (r.summary.deliveries.other ?? 0) + (r.summary.deliveries.tooLarge413 ?? 0)))} max`,
        '= 0 — anything outside 200/202/404/409/429',
    );

    assertEveryRun(
        'mailboxes closed by the app',
        (s) => s.mode !== 'storm' || s.mailboxes.closed >= s.exchanges.relayStarted * 0.9,
        (arm) => `${Math.min(...arm.map((r) => r.summary.mailboxes.closed ?? 0))} min`,
        '≥ 90% of relay exchanges ended with a DELETE — the saga concluded rather than leaving the deadline to do it',
    );
}

/** '90s' / '2m' → seconds; mirrors the scenario script's own parser. */
function durationSeconds(text) {
    let total = 0;
    for (const [, value, unit] of String(text).matchAll(/(\d+(?:\.\d+)?)(ms|s|m|h)/g)) {
        total += parseFloat(value) * { ms: 0.001, s: 1, m: 60, h: 3600 }[unit];
    }
    return total || parseFloat(text) || 1;
}

// --- Report ------------------------------------------------------------------------------------

const width = Math.max(...rows.map((r) => r.name.length), 30);
const header =
    `${'metric'.padEnd(width)}  ${`${referenceMode} (n=${reference.length})`.padStart(18)}  ` +
    `${`${candidateMode} (n=${candidate.length})`.padStart(18)}  ${'gate'.padStart(12)}  verdict  note`;

console.log(`\nmailbox-storm comparison — ${referenceMode} vs ${candidateMode}`);
const config = candidate[0].summary.config;
const controlShapes = [
    ...new Set(
        [reference, candidate]
            .flat()
            .map((r) => r.summary.config.controlShape)
            .filter(Boolean),
    ),
];
console.log(
    `config: ${config.duration} × ${candidate.length} per arm, ${config.baselineRate}/s measured enqueue, ` +
        `${config.exchangeRate}/s relay exchanges × ${config.messagesPerExchange} messages, ` +
        `${config.bufferRate}/s buffered deliveries, ${config.earlyRate}/s early-message exchanges, ` +
        `${config.controlRate ?? 0}/s extra ordinary, ${config.deliveryPayloadBytes} B payloads`,
);
console.log(
    `control shape: ${controlShapes.length > 0 ? controlShapes.join(' / ') : 'n/a (no control arm in this comparison)'}` +
        ` — 'webhook' is a receive workflow with its mailbox block removed and nothing else changed (the gate's` +
        ` control, so a difference is the mailbox's own bookkeeping); 'inproc' swaps the webhook step for an` +
        ` in-process command, and exists only to bound how much the work shape can contribute at all`,
);
console.log(
    `Δ is the difference of arm means; ± is the within-arm spread (max − min). The gate is ` +
        `${TOLERANCE_K}× the standard error of the ${referenceMode} arm's mean (σ from its spread via ` +
        `d₂, over √n) — the ${candidateMode} arm's own spread never widens it. Gates are TWO-SIDED: a ` +
        `${candidateMode} arm materially faster than expected fails too, because these arms are ` +
        `built to do the same work up to a known price, and a departure either way breaks that premise.`,
);
console.log(
    `Where a price is recorded, the gate is on |Δ − price| rather than |Δ|: the raw Δ is printed either ` +
        `way so the cost stays visible. No price is recorded today — every metric is gated against zero, ` +
        `which is the stricter reference.\n`,
);
console.log(header);
console.log('-'.repeat(header.length));
for (const row of rows) {
    console.log(
        `${row.name.padEnd(width)}  ${String(row.left).padStart(18)}  ${String(row.right).padStart(18)}  ` +
            `${String(row.limit).padStart(12)}  ${row.verdict.padEnd(7)}  ${row.note ?? ''}`,
    );
}

// --- The recorded price, printed in full with this session's own fractions ready to paste --------
{
    const shapePrices = RECORDED_PRICE.fractions[referenceControlShape ?? ''];
    const priced = shapePrices && Object.keys(shapePrices).length > 0;

    if (gatingComparison && priced) {
        const applied = priceReason === null;
        const detail = Object.entries(shapePrices)
            .map(([path, fraction]) => {
                const referenceMean = mean(
                    reference
                        .map((r) => pick(r.summary, path))
                        .filter((v) => typeof v === 'number'),
                );
                return `${path} +${fmt(fraction * 100, 1)}% (${fmt(fraction * referenceMean)} ms here)`;
            })
            .join(', ');

        console.log(
            `\nrecorded price (${applied ? 'APPLIED' : 'NOT APPLIED'}): ${detail} — measured ${RECORDED_PRICE.measuredOn}, ` +
                `REPEATS=${RECORDED_PRICE.repeats} × ${RECORDED_PRICE.duration}, ${RECORDED_PRICE.config.baselineRate}/s enqueue + ` +
                `${RECORDED_PRICE.receiverRate} receivers/s, '${referenceControlShape}'-shaped control, on ${RECORDED_PRICE.machine}; ` +
                `${RECORDED_PRICE.revision}. Confirmed: ${RECORDED_PRICE.confirmedBy}.`,
        );
        if (!applied) {
            console.log(
                `         not applied here: ${priceReason}. Every latency metric is gated against zero instead, so a ` +
                    `known cost will read as a failure.`,
            );
        }
    } else if (gatingComparison) {
        const shapeCeilings = RECORDED_PRICE.costEstablishedUnresolved[referenceControlShape ?? ''];
        const listed = Object.entries(shapeCeilings ?? {});
        console.log(
            `\nrecorded price: NONE for a '${referenceControlShape ?? '?'}'-shaped control — deliberately, not for ` +
                `want of a measurement. Two step-11 sessions measured a cost, consistent in sign at every latency ` +
                `metric and a factor of two apart in size (${RECORDED_PRICE.costSessions}), so there is no number to ` +
                `record as a price.`,
        );
        if (listed.length > 0) {
            console.log(
                `         instead a CEILING is recorded for ${listed
                    .map(([path, f]) => `${path} ${fmt(f * 100, 1)}%`)
                    .join(
                        ', ',
                    )} — the larger of each pair. Inside it a metric reads \`inconclusive\`, never ` +
                    `\`pass\`; past it, FAIL. That is what keeps the verdict from flipping by session while leaving ` +
                    `the gate falsifiable. Replace it with a fractions entry when a third session pins a size.`,
            );
            console.log(
                `         the ceiling is one-sided, covering only the dearer direction: a candidate that comes out ` +
                    `materially CHEAPER is a broken premise rather than the known cost, and still fails.`,
            );
        }
        console.log(
            `         every other metric is gated against zero, the stricter reference. See the measured section of ` +
                `.k6/README.md.`,
        );
    }

    for (const [path, reason] of Object.entries(RECORDED_PRICE.unpriced)) {
        console.log(
            `         no price for ${path}: ${reason}. It stays gated against zero — the stricter reference — so a run ` +
                `reproducing that difference reads FAIL or inconclusive. Read it as "this metric is not gateable at this ` +
                `noise floor", not as a regression.`,
        );
    }

    if (gatingComparison) {
        const derived = ['enqueue.med', 'enqueue.p95', 'enqueue.p99']
            .map((path) => {
                const left = reference
                    .map((r) => pick(r.summary, path))
                    .filter((v) => typeof v === 'number');
                const right = candidate
                    .map((r) => pick(r.summary, path))
                    .filter((v) => typeof v === 'number');
                if (left.length === 0 || right.length === 0) return `${path} —`;
                return `${path} ${((mean(right) - mean(left)) / mean(left)) * 100 >= 0 ? '+' : ''}${fmt(((mean(right) - mean(left)) / mean(left)) * 100, 1)}%`;
            })
            .join(', ');
        console.log(
            `         to record one: this session gives ${derived} at ${fmt(mean(achievedReceiverRates), 1)} receivers/s. ` +
                `Confirm with EXPECTATIONS=off (which gates against zero), then update ` +
                `RECORDED_PRICE.fractions.${referenceControlShape} in lib/compare-summaries.mjs and the measured section ` +
                `of .k6/README.md together — the number and its story move as one.`,
        );
    }
}

// Sensitivity worse than the target is itself an inconclusive verdict above, not advice.
const p95Reference = reference.map((r) => r.summary.enqueue.p95);
const p95Tolerance = Math.max(TOLERANCE_K * standardError(p95Reference), LATENCY_RESOLUTION_MS);
const p95Sensitivity = p95Tolerance / mean(p95Reference);
const p95Uncertainty = toleranceUncertainty(p95Reference.length);
console.log(
    `\ndetects: a p95 shift larger than ${fmt(p95Tolerance)} ms ` +
        `(${fmt(p95Sensitivity * 100, 1)}% of the ${fmt(mean(p95Reference))} ms ${referenceMode} p95, ` +
        `target ${fmt(TARGET_SENSITIVITY * 100, 0)}%). Anything smaller is inside this session's own variation.`,
);
console.log(
    p95Reference.length < 2
        ? `         at n=${p95Reference.length} that figure is the resolution floor, not a measurement: one run has no ` +
              `spread to estimate σ from, so nothing here is gated. Raise REPEATS to at least ` +
              `${MIN_REPEATS_TO_GATE}.`
        : `         that figure is itself a measurement with ±${fmt(p95Uncertainty * 100, 0)}% of its own spread at ` +
              `n=${p95Reference.length} (SD/mean of a range-based σ estimate, d₃/d₂: 52% at n=3, 37% at n=5, 26% at n=10), ` +
              `so do not quote it as a property of the suite. It tightens as √n with REPEATS, and with DURATION as each ` +
              `percentile rests on more observations.`,
);

const stormRuns = candidate.filter((r) => r.summary.mode === 'storm').map((r) => r.summary);
if (stormRuns.length > 0) {
    const last = stormRuns[stormRuns.length - 1];
    console.log(
        `mailbox hops (last run): mint med=${fmt(last.mailboxes.mintMed)}ms p95=${fmt(last.mailboxes.mintP95)}ms | ` +
            `receiver park med=${fmt(last.receivers.parkMed)}ms p95=${fmt(last.receivers.parkP95)}ms | ` +
            `receiver runnable med=${fmt(last.receivers.runnableMed)}ms | ` +
            `delivery wake med=${fmt(last.deliveries.wakeMed)}ms p95=${fmt(last.deliveries.wakeP95)}ms ` +
            `p99=${fmt(last.deliveries.wakeP99)}ms | delivery buffer med=${fmt(last.deliveries.bufferMed)}ms | ` +
            `capped (429) med=${fmt(last.deliveries.cappedMed)}ms | close med=${fmt(last.mailboxes.closeMed)}ms`,
    );
    console.log(
        `volumes: mailboxes minted=${last.mailboxes.minted} closed=${last.mailboxes.closed} | ` +
            `receivers=${last.receivers.enqueued} (${fmt(last.receivers.enqueuedRate, 1)}/s) | ` +
            `deliveries accepted=${last.deliveries.accepted} (${fmt(last.deliveries.acceptedRate, 1)}/s) ` +
            `buffered=${last.deliveries.buffered} dup=${last.deliveries.duplicate} 429=${last.deliveries.capped429} ` +
            `409=${last.deliveries.late409} 404=${last.deliveries.unroutable404} | ` +
            `log depth max=${fmt(last.deliveries.logDepthMax, 0)} over ${last.deliveries.bufferedMailboxes} mailboxes`,
    );
    console.log(
        `admission footprint: active workflows med=${fmt(last.engine.activeMed, 0)} max=${fmt(last.engine.activeMax, 0)}, ` +
            `parked receivers med=${fmt(last.engine.heldMed, 0)} max=${fmt(last.engine.heldMax, 0)} — ` +
            `every one of them counts against the threshold ordinary enqueues respect and delivery ingestion does not`,
    );
    console.log(
        `implied CONTROL_RATE for this configuration: ${fmt(mean(stormRuns.map((s) => s.config.impliedControlRate)), 1)}/s`,
    );
}

// Exit codes: 1 for a measured difference, 0 otherwise — `inconclusive` included, because a suite that
// goes red when it cannot tell gets disabled. An unstable arm still can never read `pass`.
// `STRICT_INCONCLUSIVE=1` restores blocking behavior.
const strictInconclusive = process.env.STRICT_INCONCLUSIVE === '1';

if (failures > 0) {
    console.log(`\nRESULT: FAIL (${failures})\n`);
    process.exit(1);
} else if (inconclusive > 0) {
    // Two remedies: repeats shrink spread; duration buys resolution.
    const remedies = [];
    if (inconclusiveSpread > 0) {
        remedies.push(
            `${inconclusiveSpread} metric(s) whose ${candidateMode} arm did not reproduce — re-run, ` +
                `raise REPEATS, or quiet the machine`,
        );
    }
    if (inconclusiveSensitivity > 0) {
        remedies.push(
            `${inconclusiveSensitivity} metric(s) whose gate is coarser than the target — raise ` +
                `DURATION so each percentile rests on more observations (raising REPEATS alone will not fix this)`,
        );
    }
    if (inconclusiveCeiling > 0) {
        remedies.push(
            `${inconclusiveCeiling} metric(s) inside the ceiling of a cost established in sign but not in ` +
                `size (${RECORDED_PRICE.costSessions}) — a third session that agrees on a size is what closes ` +
                `this, not more repeats or a longer run`,
        );
    }
    if (inconclusivePrice > 0) {
        remedies.push(
            `${inconclusivePrice} metric(s) with a recorded price that does not cover this operating point — ` +
                `run at the recorded configuration, or re-derive the price here (neither REPEATS nor DURATION helps)`,
        );
    }
    console.log(
        `\nRESULT: INCONCLUSIVE (${inconclusive}) — this session cannot answer the question:\n  ` +
            `${remedies.join('\n  ')}\n`,
    );
    console.log(
        strictInconclusive
            ? `exit 2 (STRICT_INCONCLUSIVE=1). Nothing above is a claim about the engine — an unresolved\n` +
                  `comparison is a measurement problem, and this exit code is opt-in for pipelines that want it to block.\n`
            : `exit 0: an unresolved comparison is not evidence of a regression — nor of its absence. The verdicts above\n` +
                  `stand as the finding, and no metric that could not be resolved is reported as \`pass\`. Set\n` +
                  `STRICT_INCONCLUSIVE=1 to make this block instead.\n`,
    );
    process.exit(strictInconclusive ? 2 : 0);
} else {
    console.log(
        comparisonPasses > 0
            ? '\nRESULT: pass\n'
            : `\nRESULT: ungated — ${assertionPasses} per-run assertion(s) passed, but no difference metric was gated ` +
                  `(each needs ${MIN_REPEATS_TO_GATE}+ repeats per arm), so this is not a pass on the comparison.\n`,
    );
    process.exit(0);
}
