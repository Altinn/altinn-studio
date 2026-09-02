import { useTranslation } from 'react-i18next';
import type { AssistantTexts } from '@studio/assistant';

export const useAssistantTexts = (): AssistantTexts => {
  const { t } = useTranslation();

  return {
    heading: t('top_menu.ai_assistant'),
    preview: t('ai_assistant.preview'),
    fileBrowser: t('ai_assistant.file_browser'),
    hideThreads: t('ai_assistant.hide_threads'),
    showThreads: t('ai_assistant.show_threads'),
    newThread: t('ai_assistant.new_thread'),
    previousThreads: t('ai_assistant.threads'),
    aboutAssistantDialog: {
      heading: t('ai_assistant.about_assistant_heading'),
      intro: t('ai_assistant.about_assistant_intro'),
      assistantDocsInfo: t('ai_assistant.about_assistant_docs_info'),
      assistantDocsLink: t('ai_assistant.about_assistant_docs_link'),
      disclaimer: t('ai_assistant.about_assistant_disclaimer'),
      privacyDataHandling: t('ai_assistant.about_assistant_privacy_data_handling'),
    },
    emptyThread: {
      welcome: t('ai_assistant.empty_thread_welcome'),
      instruction: t('ai_assistant.empty_thread_instruction'),
    },
    textarea: {
      placeholder: t('ai_assistant.textarea_placeholder'),
    },
    addAttachment: t('ai_assistant.add_attachment'),
    allowAppChangesSwitch: t('ai_assistant.allow_app_changes'),
    send: t('ai_assistant.send'),
    cancel: t('general.cancel'),
    assistantFirstMessage: t('ai_assistant.assistant_first_message'),
    feedback: {
      thumbsUp: t('ai_assistant.feedback_thumbs_up'),
      thumbsDown: t('ai_assistant.feedback_thumbs_down'),
      heading: t('ai_assistant.feedback_heading'),
      detailsLabel: t('ai_assistant.feedback_details_label'),
      detailsOptionalTag: t('general.optional'),
      submit: t('ai_assistant.feedback_submit'),
      clear: t('ai_assistant.feedback_clear'),
      cancel: t('general.cancel'),
    },
    criticalFileAlert: {
      heading: t('ai_assistant.critical_file_alert_heading'),
      description: t('ai_assistant.critical_file_alert_description'),
    },
    securityNoticeAlert: {
      heading: t('ai_assistant.security_notice_alert_heading'),
      description: t('ai_assistant.security_notice_alert_description'),
    },
    permissionPrompt: {
      heading: t('ai_assistant.permission_prompt_heading'),
      allow: t('ai_assistant.permission_prompt_allow'),
      deny: t('ai_assistant.permission_prompt_deny'),
    },
    sourcesLabel: t('ai_assistant.sources_label'),
  };
};
