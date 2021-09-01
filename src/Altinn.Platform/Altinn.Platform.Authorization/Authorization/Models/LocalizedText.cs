namespace Altinn.Platform.Authorization.Models
{
    /// <summary>
    /// This model describes text resource specifiable in the three supported user interface lanugages of Altinn; Norwegian Bokmaal (nb), Norwegian Nynorsk (nn) and English (en).
    /// </summary>
    public class LocalizedText
    {
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
