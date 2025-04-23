namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// Defines a consent template
    /// </summary>
    public class ConsentTemplate
    {
        /// <summary>
        /// Template id
        /// </summary>
        public string Id { get; set; }

        /// <summary>
        /// Title of the consent template
        /// </summary>
        public string Title { get; set; }

        /// <summary>
        /// If template is used for a power of attorney (POA) or consent
        /// </summary>
        public bool IsPoa { get; set; }

        /// <summary>
        /// If custom message is set when sending consent request
        /// </summary>
        public bool IsMessageSetInRequest { get; set; }

        /// <summary>
        /// Texts for consent content and history
        /// </summary>
        public ConsentTemplateTexts Texts { get; set; }
    }
}
