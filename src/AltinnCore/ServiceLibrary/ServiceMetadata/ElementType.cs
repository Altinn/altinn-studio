namespace AltinnCore.ServiceLibrary.ServiceMetadata
{
    /// <summary>
    /// Enumeration for the different type of service elements
    /// </summary>
    public enum ElementType
    {
        /// <summary>
        /// Field element
        /// </summary>
        Field,

        /// <summary>
        /// Group element (can contain several groups and / or fields)
        /// </summary>
        Group,

        /// <summary>
        /// Xml attribute
        /// </summary>
        Attribute
    }
}