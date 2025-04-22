using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Defines texts used in consent templates
    /// </summary>
    public class ConsentTemplateTexts
    {
        public ConsentTemplateTypeText Title { get; set; }
        public ConsentTemplateTypeText Heading { get; set; }
        public ConsentTemplateTypeText ServiceIntro { get; set; }
        public Dictionary<string, string> OverriddenDelegationContext { get; set; }
        public Dictionary<string, string> Expiration { get; set; }
        public Dictionary<string, string> ExpirationOneTime { get; set; }
        public ConsentTemplateTypeText ServiceIntroAccepted { get; set; }
        public Dictionary<string, string> HandledBy { get; set; }
        public Dictionary<string, string> HistoryUsedBody { get; set; }
        public Dictionary<string, string> HistoryUsedByHandledByBody { get; set; }
    }
}
