import { useAppBuilder } from '../contexts/AppBuilderContext';
import { usePageEditing } from '../components/PageEditing/PageEditingContext';
import type { LayoutComponent, PageLayout } from '../types';
import {
  getChildComponents,
  moveComponent,
  removeComponent,
  setProperty,
  updateComponent,
} from '../utils/layoutUtils';
import { addQuestionToLikert, createQuestion, LIKERT_ITEM_TYPE } from '../utils/likertUtils';
import { generateComponentId } from '../utils/newComponentUtils';

export type LikertQuestions = {
  questions: LayoutComponent[];
  /** Adds one or more questions last, in one save. The data model is not changed. */
  addQuestions: (texts: string[]) => Promise<void>;
  /** Removes a question and returns the layout from before, so the removal can be undone. */
  removeQuestion: (questionId: string) => PageLayout;
  restoreLayout: (layout: PageLayout) => void;
  moveQuestion: (questionId: string, offset: number) => void;
  setRequired: (questionId: string, required: boolean) => void;
  setAllRequired: (required: boolean) => void;
};

/**
 * The questions of a Likert table and what the user can do with them. They live in the layout only,
 * so writing, rewording, moving and removing them never changes the data model. Removing can be
 * undone.
 */
export function useLikertQuestions(likert: LayoutComponent): LikertQuestions {
  const { layouts } = useAppBuilder();
  const { pageName, layout, saveLayout, saveTexts } = usePageEditing();
  const questions = getChildComponents(layout, likert);

  const addQuestions = async (texts: string[]): Promise<void> => {
    if (texts.length === 0) return;
    const takenIds = new Set<string>();
    let updated = layout;
    const newTexts: Record<string, string> = {};
    texts.forEach((text) => {
      let id: string;
      do {
        id = generateComponentId(LIKERT_ITEM_TYPE, layouts);
      } while (takenIds.has(id));
      takenIds.add(id);
      const titleKey = `${pageName}.${id}.title`;
      newTexts[titleKey] = text;
      // New questions start as required, the default everywhere in the table.
      const question = createQuestion({ id, titleKey, required: true });
      updated = addQuestionToLikert(updated, likert.id, question);
    });
    saveTexts(newTexts);
    saveLayout(updated);
  };

  const setRequiredOn = (current: PageLayout, id: string, required: boolean): PageLayout =>
    updateComponent(current, id, (q) => setProperty(q, 'required', required ? true : undefined));

  return {
    questions,
    addQuestions,
    removeQuestion: (questionId) => {
      saveLayout(removeComponent(layout, questionId));
      return layout;
    },
    restoreLayout: saveLayout,
    moveQuestion: (questionId, offset) => saveLayout(moveComponent(layout, questionId, offset)),
    setRequired: (questionId, required) => saveLayout(setRequiredOn(layout, questionId, required)),
    setAllRequired: (required) =>
      saveLayout(
        questions.reduce((current, { id }) => setRequiredOn(current, id, required), layout),
      ),
  };
}
