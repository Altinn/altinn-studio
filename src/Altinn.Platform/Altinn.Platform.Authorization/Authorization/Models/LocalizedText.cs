namespace Altinn.Platform.Authorization.Models
{
    /// <summary>
    /// This model describes text resource specifiable in the three supported user interface lanugages of Altinn; Norwegian Bokmaal (nb), Norwegian Nynorsk (nn) and English (en).
    /// </summary>
    public class LocalizedText
    {
        /// <summary>
        /// Sets localizedtext on all languages
        /// </summary>
        /// <param name="nb">Norwegian Bokmaal text</param>
        /// <param name="nn">Norwegian Nynorsk text</param>
        /// <param name="en">English text</param>
        public LocalizedText(string nb, string nn, string en)
        {
            NB = nb;
            NN = nn;
            EN = en;
        }

        /// <summary>
        /// Gets or sets Norwegian Bokmaal translation for the text resource.
        /// </summary>
        public string NB { get; set; }

        /// <summary>
        /// Gets or sets Norwegian Nynorsk translation for the text resource.
        /// </summary>
        public string NN { get; set; }

        /// <summary>
        /// Gets or sets English translation for the text resource.
        /// </summary>
        public string EN { get; set; }
    }
}
