import { post } from 'app-shared/utils/networking';

/**
 * Submits the feedback to the backend, and triggers a toast message on success or failure.
 * Must be called from a component, as it uses the translation hook.
 * @param answers The feedback answers.
 * @param path The path to submit the feedback to.
 */
export const submitFeedback = async (answers: Record<string, string>, path: string) => {
  try {
    // Using regular axios post rather than a mutation hook, since we are not storing
    // the feedback in the cache, nor are we updating any state.
    await post(path, { answers: { ...answers } });
  } catch (error) {
    console.error('Failed to submit feedback', error);
    throw error;
  }
};
