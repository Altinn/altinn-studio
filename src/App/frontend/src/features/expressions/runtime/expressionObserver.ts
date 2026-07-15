export type ExpressionDependency =
  | { type: 'applicationSettings' }
  | { type: 'currentLanguage' }
  | { type: 'currentPage' }
  | { type: 'displayValue'; componentId: string }
  | { type: 'externalApi' }
  | { type: 'formData'; reference: { dataType: string; field: string } }
  | { type: 'instanceDataElementCount'; dataType: string }
  | { type: 'instanceDataSources' }
  | { type: 'language'; dataModelPath: { dataType: string; field: string } | undefined }
  | { type: 'layout' }
  | { type: 'options'; optionsId: string }
  | { type: 'process' };

export type ExpressionSubscriptionOwner = 'runtime' | 'storeSelector';

type Subscribe = (onStoreChange: () => void) => () => void;
type ReadDependencyValue = (dependency: ExpressionDependency) => unknown;

/**
 * Tracks which dependencies were touched during expression evaluation and schedules rerenders
 * when those concrete values change.
 */
export class ExpressionObserver {
  private collected = new Map<string, ExpressionDependency>();
  private active = new Map<string, ExpressionDependency>();
  private lastValues = new Map<string, unknown>();
  private evaluatedDuringCollect = false;
  private unsubscribeStore?: (() => void) | null;
  private unsubscribeQuery?: (() => void) | null;
  private subscribeQuery?: Subscribe;
  private subscribed = false;
  private rerenderScheduled = false;

  constructor(
    private readonly onChange: () => void,
    private readonly readDependencyValue: ReadDependencyValue,
  ) {}

  beginCollect() {
    this.collected.clear();
    this.evaluatedDuringCollect = false;
  }

  markEvaluated() {
    this.evaluatedDuringCollect = true;
  }

  track(dependency: ExpressionDependency) {
    this.collected.set(makeDependencyKey(dependency), dependency);
  }

  commitCollect() {
    // The runtime hook starts a collection during render, but dependency collection is only meaningful if evalExpr()
    // actually ran in that same collection pass. If no expression ran, an empty collection only means "nothing was
    // evaluated now", not "the previous expression no longer depends on anything".
    if (!this.evaluatedDuringCollect) {
      return;
    }

    this.active = new Map(this.collected);
    this.lastValues = this.readValues(this.active);
    this.syncQuerySubscription();
  }

  getDependencies() {
    return [...this.active.values()];
  }

  checkHookInputs() {
    // Another dependency may already have caused the expression to run with the latest hook inputs in this render.
    if (this.evaluatedDuringCollect) {
      return;
    }
    this.checkForChanges(isHookBackedDependency);
  }

  subscribe({
    owner,
    subscribeStore,
    subscribeQuery,
  }: {
    owner: ExpressionSubscriptionOwner;
    subscribeStore: Subscribe | undefined;
    subscribeQuery: Subscribe;
  }) {
    this.unsubscribeStore?.();
    this.unsubscribeQuery?.();
    this.subscribeQuery = subscribeQuery;
    this.subscribed = false;

    this.unsubscribeStore =
      owner === 'runtime' && subscribeStore
        ? subscribeStore(() => this.checkForChanges(isStoreBackedDependency))
        : null;

    this.unsubscribeQuery = null;
    this.subscribed = true;
    this.syncQuerySubscription();

    return () => {
      this.subscribed = false;
      this.unsubscribeStore?.();
      this.unsubscribeQuery?.();
      this.unsubscribeStore = null;
      this.unsubscribeQuery = null;
      this.subscribeQuery = undefined;
    };
  }

  private checkForChanges(shouldCheck: (dependency: ExpressionDependency) => boolean) {
    if (this.active.size === 0) {
      return;
    }

    const dependencies = new Map<string, ExpressionDependency>();
    for (const [key, dependency] of this.active) {
      if (shouldCheck(dependency)) {
        dependencies.set(key, dependency);
      }
    }

    if (dependencies.size === 0) {
      return;
    }

    const nextValues = this.readValues(dependencies);
    for (const [key, nextValue] of nextValues) {
      const previousValue = this.lastValues.get(key);
      if (!Object.is(previousValue, nextValue)) {
        this.lastValues = new Map([...this.lastValues, ...nextValues]);
        this.scheduleRerender();
        return;
      }
    }
  }

  private syncQuerySubscription() {
    if (!this.subscribed || !this.subscribeQuery) {
      return;
    }

    const needsQuerySubscription = [...this.active.values()].some(isQueryBackedDependency);
    if (needsQuerySubscription && !this.unsubscribeQuery) {
      this.unsubscribeQuery = this.subscribeQuery(() => this.checkForChanges(isQueryBackedDependency));
    } else if (!needsQuerySubscription && this.unsubscribeQuery) {
      this.unsubscribeQuery();
      this.unsubscribeQuery = null;
    }
  }

  private scheduleRerender() {
    if (this.rerenderScheduled) {
      return;
    }

    this.rerenderScheduled = true;
    queueMicrotask(() => {
      this.rerenderScheduled = false;
      if (this.subscribed) {
        this.onChange();
      }
    });
  }

  private readValues(dependencies: Map<string, ExpressionDependency>) {
    const values = new Map<string, unknown>();
    for (const [key, dependency] of dependencies) {
      values.set(key, this.readDependencyValue(dependency));
    }
    return values;
  }
}

function isStoreBackedDependency(dependency: ExpressionDependency) {
  return dependency.type === 'formData' || dependency.type === 'layout' || dependency.type === 'options';
}

function isHookBackedDependency(dependency: ExpressionDependency) {
  return (
    dependency.type === 'applicationSettings' ||
    dependency.type === 'currentLanguage' ||
    dependency.type === 'currentPage' ||
    dependency.type === 'language'
  );
}

function isQueryBackedDependency(dependency: ExpressionDependency) {
  return (
    dependency.type === 'externalApi' ||
    dependency.type === 'instanceDataElementCount' ||
    dependency.type === 'instanceDataSources' ||
    dependency.type === 'language' ||
    dependency.type === 'process'
  );
}

function makeDependencyKey(dependency: ExpressionDependency) {
  switch (dependency.type) {
    case 'formData':
      return `formData:${dependency.reference.dataType}:${dependency.reference.field}`;
    case 'instanceDataElementCount':
      return `instanceDataElementCount:${dependency.dataType}`;
    case 'displayValue':
      return `displayValue:${dependency.componentId}`;
    case 'options':
      return `options:${dependency.optionsId}`;
    case 'language':
      return `language:${dependency.dataModelPath?.dataType ?? ''}:${dependency.dataModelPath?.field ?? ''}`;
    default:
      return dependency.type;
  }
}
