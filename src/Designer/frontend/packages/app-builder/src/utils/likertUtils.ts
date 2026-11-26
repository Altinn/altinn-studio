import type { JsonSchema } from 'app-shared/types/JsonSchema';
import type { LayoutComponent, PageLayout, PageLayouts, TextsById } from '../types';
import { findComponent, getChildComponents, insertComponent, withComponents } from './layoutUtils';
import type { Placement } from './layoutUtils';
import { generateComponentId } from './newComponentUtils';
import { LIKERT_ITEM_TYPE, LIKERT_STATIC_TYPE } from '../constants';

export { LIKERT_ITEM_TYPE, LIKERT_STATIC_TYPE };

/**
 * A Likert table whose questions are written in the layout, not read from a list in the data model.
 * Each question is a LikertItem child, so required and hidden work per question. The answers are
 * saved in one list that every table shares; see LIKERT_MODEL_FIELD.
 */

export function isLikertStatic(component: Pick<LayoutComponent, 'type'>): boolean {
  return component.type === LIKERT_STATIC_TYPE;
}

export type LikertScaleId = 'agree' | 'satisfied' | 'own';

type ScaleTexts = Record<'nb' | 'nn' | 'en', string[]>;

/** The ready-made scales, in the languages the builder can add to an app. */
export const likertScales: Record<Exclude<LikertScaleId, 'own'>, ScaleTexts> = {
  agree: {
    nb: ['Helt enig', 'Enig', 'Nøytral', 'Uenig', 'Helt uenig'],
    nn: ['Heilt einig', 'Einig', 'Nøytral', 'Ueinig', 'Heilt ueinig'],
    en: ['Strongly agree', 'Agree', 'Neutral', 'Disagree', 'Strongly disagree'],
  },
  satisfied: {
    nb: ['Svært fornøyd', 'Fornøyd', 'Nøytral', 'Misfornøyd', 'Svært misfornøyd'],
    nn: ['Svært nøgd', 'Nøgd', 'Nøytral', 'Misnøgd', 'Svært misnøgd'],
    en: ['Very satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very dissatisfied'],
  },
};

export const dontKnowTexts: Record<'nb' | 'nn' | 'en', string> = {
  nb: 'Vet ikke',
  nn: 'Veit ikkje',
  en: "Don't know",
};

export const otherLanguages = ['nn', 'en'] as const;

/** What the user fills in to add a Likert table. */
export type NewLikertValues = {
  title: string;
  scale: LikertScaleId;
  /** The options the user wrote, used when the scale is their own. */
  ownOptions: string[];
  includeDontKnow: boolean;
  questions: string[];
  /** Whether each question must be answered, in the same order as the questions. */
  required: boolean[];
};

/**
 * Every Likert table saves to the same list in the data model, so the model never depends on what
 * the tables ask. The list is added once, the first time a table is added, and is not changed when
 * questions are written, reworded, moved or removed. Its values are filled in when the form is
 * filled in: one element per table, found by its category, with the question texts and the answers
 * in the language the user filled in.
 */
export const LIKERT_MODEL_FIELD = 'likert';

const likertDefinitions: Record<string, JsonSchema> = {
  Likert: {
    type: 'object',
    properties: {
      category: { type: 'string' },
      questions: { type: 'array', items: { $ref: '#/$defs/LikertQuestion' } },
    },
  } as JsonSchema,
  LikertQuestion: {
    type: 'object',
    properties: {
      text: { type: 'string' },
      answer: { type: 'string' },
      answerText: { type: 'string' },
    },
  } as JsonSchema,
};

export function hasLikertModel(schema: JsonSchema | undefined): boolean {
  return Boolean(schema?.properties?.[LIKERT_MODEL_FIELD]);
}

/** The schema with the list and its two types, or the schema as it is if it has them. */
export function withLikertModel(schema: JsonSchema): JsonSchema {
  if (hasLikertModel(schema)) return schema;
  return {
    ...schema,
    properties: {
      ...(schema.properties ?? {}),
      [LIKERT_MODEL_FIELD]: { type: 'array', items: { $ref: '#/$defs/Likert' } },
    },
    $defs: { ...(schema.$defs ?? {}), ...likertDefinitions },
  };
}

/** The categories of every Likert table in the app, which must differ to tell the tables apart. */
export function getLikertCategories(layouts: PageLayouts): string[] {
  return Object.values(layouts)
    .flatMap((layout) => layout?.data?.layout ?? [])
    .filter(isLikertStatic)
    .map((component) => getCategory(component))
    .filter(Boolean);
}

export function getCategory(component: LayoutComponent): string {
  return typeof component.category === 'string' ? component.category : '';
}

/** A category from the heading, in lower case with hyphens, and a number if it is taken. */
export function suggestCategory(title: string, taken: string[]): string {
  const base =
    title
      .toLowerCase()
      .replace(/æ/g, 'ae')
      .replace(/ø/g, 'o')
      .replace(/å/g, 'a')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .split('-')
      .slice(0, 5)
      .join('-') || 'skala';
  let category = base;
  for (let n = 2; taken.includes(category); n++) category = `${base}-${n}`;
  return category;
}

/** The texts of the options in the edited language, with "Don't know" last if chosen. */
export function getScaleOptionTexts(
  values: Pick<NewLikertValues, 'scale' | 'ownOptions' | 'includeDontKnow'>,
): string[] {
  const base = values.scale === 'own' ? values.ownOptions : likertScales[values.scale].nb;
  return values.includeDontKnow ? [...base, dontKnowTexts.nb] : base;
}

export type NewLikert = {
  parent: LayoutComponent;
  children: LayoutComponent[];
  /** Texts in the edited language. */
  texts: TextsById;
  /** Texts in other languages, for the ready-made scales. */
  translations: Partial<Record<(typeof otherLanguages)[number], TextsById>>;
};

export type CreateLikertArgs = {
  values: NewLikertValues;
  pageName: string;
  layouts: PageLayouts;
  dataType?: string;
};

/** Creates the table, a child per question and their texts. The data model is not touched. */
export function createLikert({ values, pageName, layouts, dataType }: CreateLikertArgs): NewLikert {
  const parentId = generateComponentId(LIKERT_STATIC_TYPE, layouts);
  const key = (componentId: string, name: string): string => `${pageName}.${componentId}.${name}`;
  const texts: TextsById = { [key(parentId, 'title')]: values.title };
  const translations: NewLikert['translations'] = {};

  const optionTexts = getScaleOptionTexts(values);
  const options = optionTexts.map((text, index) => {
    const optionKey = key(parentId, `option${index + 1}`);
    texts[optionKey] = text;
    return { value: `${index + 1}`, label: optionKey };
  });

  // A ready-made scale is known in every language, so it is translated as it is added.
  if (values.scale !== 'own') {
    otherLanguages.forEach((language) => {
      const translated = [...likertScales[values.scale as 'agree'][language]];
      if (values.includeDontKnow) translated.push(dontKnowTexts[language]);
      translations[language] = Object.fromEntries(
        options.map(({ label }, index) => [label, translated[index]]),
      );
    });
  }

  const parent: LayoutComponent = {
    id: parentId,
    type: LIKERT_STATIC_TYPE,
    category: suggestCategory(values.title, getLikertCategories(layouts)),
    textResourceBindings: { title: key(parentId, 'title') },
    options,
    children: [],
  };
  if (dataType) {
    parent.dataModelBindings = {
      group: { field: LIKERT_MODEL_FIELD, dataType },
    } as unknown as LayoutComponent['dataModelBindings'];
  }

  if (values.includeDontKnow) {
    parent.columns = [{ value: `${options.length}`, divider: 'before' }];
  }

  const takenIds = new Set<string>([parentId]);
  const children = values.questions.map((question, index) => {
    let childId: string;
    do {
      childId = generateComponentId(LIKERT_ITEM_TYPE, layouts);
    } while (takenIds.has(childId));
    takenIds.add(childId);
    const titleKey = key(childId, 'title');
    texts[titleKey] = question;
    return createQuestion({ id: childId, titleKey, required: values.required[index] ?? true });
  });

  parent.children = children.map(({ id }) => id);
  return { parent, children, texts, translations };
}

type CreateQuestionArgs = {
  id: string;
  titleKey: string;
  required: boolean;
};

/**
 * A question row: its text and whether it must be answered. It has no field of its own; the table
 * saves its text and answer in the list when the form is filled in.
 */
export function createQuestion({ id, titleKey, required }: CreateQuestionArgs): LayoutComponent {
  const child: LayoutComponent = {
    id,
    type: LIKERT_ITEM_TYPE,
    textResourceBindings: { title: titleKey },
  };
  if (required) child.required = true;
  return child;
}

/** Inserts the table where the user chose, and its questions right after it in the file. */
export function insertLikert(
  layout: PageLayout,
  parent: LayoutComponent,
  children: LayoutComponent[],
  placement: Placement,
  fixedIds: Set<string>,
): PageLayout {
  const withParent = insertComponent(layout, parent, placement, fixedIds);
  const components = [...withParent.data.layout];
  const parentIndex = components.findIndex(({ id }) => id === parent.id);
  components.splice(parentIndex + 1, 0, ...children);
  return withComponents(withParent, components);
}

/** Adds a question last in the table and returns the new layout. */
export function addQuestionToLikert(
  layout: PageLayout,
  parentId: string,
  question: LayoutComponent,
): PageLayout {
  const parent = findComponent(layout, parentId);
  if (!parent) return layout;
  const questions = getChildComponents(layout, parent);
  const lastId = questions[questions.length - 1]?.id ?? parentId;
  const components = [...layout.data.layout];
  const index = components.findIndex(({ id }) => id === lastId);
  components.splice(index + 1, 0, question);
  return withComponents(
    layout,
    components.map((component) =>
      component.id === parentId
        ? { ...component, children: [...(component.children ?? []), question.id] }
        : component,
    ),
  );
}

/** Whether the table shows a line before its last option, which sets "Don't know" apart. */
export function hasDividerBeforeLast(parent: LayoutComponent): boolean {
  const options: unknown[] = Array.isArray(parent.options) ? parent.options : [];
  const last = options[options.length - 1] as { value?: unknown } | undefined;
  const columns: { value: unknown; divider?: string }[] = Array.isArray(parent.columns)
    ? parent.columns
    : [];
  return Boolean(
    last &&
    columns.some(
      ({ value, divider }) => String(value) === String(last.value) && divider === 'before',
    ),
  );
}

export function setDividerBeforeLast(parent: LayoutComponent, isOn: boolean): LayoutComponent {
  const options: { value: unknown }[] = Array.isArray(parent.options) ? parent.options : [];
  const last = options[options.length - 1];
  if (!last || !isOn) {
    const { columns: _columns, ...rest } = parent;
    return rest as LayoutComponent;
  }
  return { ...parent, columns: [{ value: String(last.value), divider: 'before' }] };
}

/** The scale and "Don't know" are one choice, since people pick them together. */
export const scaleChoices = [
  { id: 'agree-dk', scale: 'agree', dontKnow: true },
  { id: 'agree', scale: 'agree', dontKnow: false },
  { id: 'satisfied-dk', scale: 'satisfied', dontKnow: true },
  { id: 'satisfied', scale: 'satisfied', dontKnow: false },
  { id: 'own', scale: 'own', dontKnow: false },
] as const satisfies readonly { id: string; scale: LikertScaleId; dontKnow: boolean }[];

export type ScaleChoiceId = (typeof scaleChoices)[number]['id'];

/** The ready-made choice whose texts the options have, or 'own' if they match none. */
export function findScaleChoice(optionTexts: string[]): ScaleChoiceId {
  const match = scaleChoices.find(({ scale, dontKnow }) => {
    if (scale === 'own') return false;
    const texts = [...likertScales[scale].nb, ...(dontKnow ? [dontKnowTexts.nb] : [])];
    return texts.length === optionTexts.length && texts.every((text, i) => text === optionTexts[i]);
  });
  return match?.id ?? 'own';
}

export type BuiltScale = {
  options: { value: string; label: string }[];
  columns?: { value: string; divider: 'before' }[];
  /** Texts by language, with the edited language first. */
  texts: Record<'nb' | 'nn' | 'en', Record<string, string>>;
};

/**
 * The options and texts for a ready-made scale on a table that already exists. Option values are
 * numbered from 1 again, so "Don't know" is always last.
 */
export function buildScale(
  choiceId: Exclude<ScaleChoiceId, 'own'>,
  keyFor: (n: number) => string,
): BuiltScale {
  const choice = scaleChoices.find(({ id }) => id === choiceId)!;
  const scale = choice.scale as 'agree' | 'satisfied';
  const withDontKnow = (language: 'nb' | 'nn' | 'en'): string[] => [
    ...likertScales[scale][language],
    ...(choice.dontKnow ? [dontKnowTexts[language]] : []),
  ];
  const nb = withDontKnow('nb');
  const options = nb.map((_, i) => ({ value: `${i + 1}`, label: keyFor(i + 1) }));
  const texts = Object.fromEntries(
    (['nb', 'nn', 'en'] as const).map((language) => [
      language,
      Object.fromEntries(withDontKnow(language).map((text, i) => [keyFor(i + 1), text])),
    ]),
  ) as BuiltScale['texts'];
  return {
    options,
    columns: choice.dontKnow ? [{ value: `${options.length}`, divider: 'before' }] : undefined,
    texts,
  };
}
