namespace AltinnCore.ServiceLibrary
{
    /// <summary>
    /// Class containing the metadata for a service field
    /// </summary>
    public class FieldMetadata
    {
        /// <summary>
        /// Gets or sets the id of the field
        /// </summary>
        public string Field { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether this field is read only
        /// </summary>
        public bool ReadOnly { get; set; }

        /// <summary>
        /// Gets or sets the option code resource key
        /// </summary>
        public string OptionCodeKey { get; set; }

        /// <summary>
        /// Gets or sets the default value resource key
        /// </summary>
        public string DefaultValueKey { get; set; }

        /// <summary>
        /// Gets or sets the placeholder text resource key
        /// </summary>
        public string PlaceHolderTextKey { get; set; }

        /// <summary>
        /// Gets or sets the title text resource key
        /// </summary>
        public string TitleTextKey { get; set; }

        /// <summary>
        /// Gets or sets the data content text resource key
        /// </summary>
        public string DataContentTextKey { get; set; }
    }
}
