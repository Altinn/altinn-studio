namespace Altinn.App.Services.ModelMetadata
{
    /// <summary>
    /// Class representing a service element restriction
    /// </summary>
    public class Restriction
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="Restriction"/> class
        /// </summary>
        public Restriction()
        {
        }

        /// <summary>
        /// Gets or sets base value type
        /// </summary>
        public string Value { get; set; }
        
        /// <summary>
        /// Gets or sets error texts
        /// </summary>
        public string ErrortText { get; set; }
    }
}
