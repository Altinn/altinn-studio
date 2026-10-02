import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './types';

interface StageProps {
  children: ReactNode;
  /** Extra class on the letterbox element. */
  className?: string;
}

/**
 * A fixed 1920x1080 logical canvas, letterboxed into whatever window it is given.
 *
 * The letterbox uses `aspect-ratio` + `min()` so the browser does the fitting,
 * and the canvas inside is scaled with a CSS transform. That keeps every
 * typographic value inside a slide in ABSOLUTE px on the canvas — a 96px
 * heading is 96px at authoring time regardless of the projector.
 */
export function Stage({ children, className }: StageProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    const measure = () => {
      const { width } = el.getBoundingClientRect();
      if (width > 0) setScale(width / CANVAS_WIDTH);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <div className="stage-frame">
      <div ref={boxRef} className={['stage-letterbox', className].filter(Boolean).join(' ')}>
        <div
          className="stage-canvas"
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            transform: `scale(${scale})`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

interface ThumbStageProps {
  children: ReactNode;
  /** Rendered width of the thumbnail in CSS px. */
  width: number;
}

/** The same canvas trick, but at an explicit small size (overview thumbnails). */
export function ThumbStage({ children, width }: ThumbStageProps) {
  const scale = width / CANVAS_WIDTH;
  return (
    <div
      className="thumb-letterbox"
      style={{ width, height: width * (CANVAS_HEIGHT / CANVAS_WIDTH) }}
      aria-hidden
    >
      <div
        className="stage-canvas"
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
