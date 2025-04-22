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

        public bool IsFullmakt { get; set; }
        public bool HasCustomMessage { get; set; }

        public ConsentTemplateTexts Texts { get; set; }
    }
}
