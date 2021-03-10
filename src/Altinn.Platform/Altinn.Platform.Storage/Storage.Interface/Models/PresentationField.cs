namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Holds the definition of a presentation field for an application.
    /// </summary>
    public class PresentationField
    {
        /// <summary>
        /// Gets or sets the id of the presentation field
        /// </summary>
        public string Id { get; set; }

        /// <summary>
        /// Gets or sets the path of the presentation field
        /// </summary>
        public string Path { get; set; }

        /// <summary>
        /// Gets or sets the data type where the presentation field is defined.
        /// </summary>
        public string DataTypeId { get; set; }
    }
}
