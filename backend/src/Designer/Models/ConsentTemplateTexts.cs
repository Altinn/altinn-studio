using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Defines texts used in consent templates
    /// </summary>
    public class ConsentTemplateTexts
    {
        /// <summary>
        /// Consent title
        /// </summary>
        public ConsentTemplateTypeText Title { get; set; }

        /// <summary>
        /// Consent heading
        /// </summary>
        public ConsentTemplateTypeText Heading { get; set; }

        /// <summary>
        /// Consent intro
        /// </summary>
        public ConsentTemplateTypeText ServiceIntro { get; set; }

        /// <summary>
        /// Consent message, if not set in request
        /// </summary>
        public Dictionary<string, string> OverriddenDelegationContext { get; set; }

        /// <summary>
        /// Consent expiration text
        /// </summary>
        public Dictionary<string, string> Expiration { get; set; }

        /// <summary>
        /// Consent expiration text for one time consent
        /// </summary>
        public Dictionary<string, string> ExpirationOneTime { get; set; }

        /// <summary>
        /// Consent text for accepted consent in history
        /// </summary>
        public ConsentTemplateTypeText ServiceIntroAccepted { get; set; }

        /// <summary>
        /// Consent handled by text in history
        /// </summary>
        public Dictionary<string, string> HandledBy { get; set; }

        /// <summary>
        /// Consent handled by body text in history
        /// </summary>
        public Dictionary<string, string> HistoryUsedBody { get; set; }

        /// <summary>
        /// Consent used by body text in history
        /// </summary>
        public Dictionary<string, string> HistoryUsedByHandledByBody { get; set; }
    }
}
