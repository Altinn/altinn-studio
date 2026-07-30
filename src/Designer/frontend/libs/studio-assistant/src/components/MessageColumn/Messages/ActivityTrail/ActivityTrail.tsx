import type { ReactElement } from 'react';
import type { TrailStep } from '../../../../types/WorkflowStatus';
import classes from './ActivityTrail.module.css';

const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
/**
 * Keep only the most recent N steps on screen. The trail can run for
 * minutes and accrue 30+ entries — past a point, older rows are noise.
 * The container mask gradient fades the topmost visible row off-screen
 * so the cut isn't a hard slice.
 */
const MAX_VISIBLE_STEPS = 6;

export type ActivityTrailProps = {
  steps: TrailStep[];
};

export function ActivityTrail({ steps }: ActivityTrailProps): ReactElement | null {
  if (steps.length === 0) return null;
  const visibleSteps = steps.length > MAX_VISIBLE_STEPS ? steps.slice(-MAX_VISIBLE_STEPS) : steps;
  const activeIndex = visibleSteps.length - 1;
  // role="list"/"listitem" instead of <ol>/<li>: the parent assistantMessage
  // styles native list elements (margin, padding, decimal markers) and would
  // win the cascade. ARIA roles preserve the semantic for screen readers
  // without inheriting those rules.
  return (
    <div className={classes.trail} role='list' aria-live='polite'>
      {visibleSteps.map((step, index) => (
        <TrailStepRow key={step.id} step={step} isActive={index === activeIndex} />
      ))}
    </div>
  );
}

type TrailStepRowProps = {
  step: TrailStep;
  isActive: boolean;
};

// Inline backup styles for the dot. CSS-modules can lose to cascading
// parent rules in this codebase (the assistantMessage ancestor styles
// list-element descendants aggressively). Width/height/display set
// inline always win over class rules, so even if the module's `.dot`
// class were ever to fail to apply we'd still get a 12px round element.
const DOT_BACKUP_STYLE = {
  display: 'block',
  width: 12,
  height: 12,
  minWidth: 12,
  minHeight: 12,
  flex: '0 0 12px',
  borderRadius: '50%',
} as const;

function TrailStepRow({ step, isActive }: TrailStepRowProps): ReactElement {
  const stepClass = isActive ? `${classes.step} ${classes.stepActive}` : classes.step;
  const dotClass = isActive
    ? `${classes.dot} ${classes.dotActive}`
    : `${classes.dot} ${classes.dotDone}`;
  const labelClass = isActive ? `${classes.label} ${classes.labelActive}` : classes.label;
  return (
    <div className={stepClass} role='listitem'>
      <div
        className={dotClass}
        aria-hidden={true}
        data-testid='activity-trail-dot'
        style={DOT_BACKUP_STYLE}
      />
      <span className={labelClass}>{step.message}</span>
      <span className={classes.timestamp}>{formatElapsed(step.offsetMs)}</span>
    </div>
  );
}

function formatElapsed(offsetMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(offsetMs / MILLISECONDS_PER_SECOND));
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
