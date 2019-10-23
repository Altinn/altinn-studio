namespace AltinnCore.Runtime.Models
{
    /// <summary>
    /// Represents unique codes for different validation issues. The values should also exists in language files as lookup keys.
    /// </summary>
    public static class ValidationIssueCodes
    {
        /// <summary>
        /// Represents unique codes for validation issues on the instance level. 
        /// </summary>
        public static class InstanceCodes
        {
            /// <summary>
            /// Gets a value that represents a validation issue where an instance have more elements of a given type than the application allows.
            /// </summary>
            public static string TooManyDataElementsOfType => nameof(TooManyDataElementsOfType);

            /// <summary>
            /// Gets a value that represents a validation issue where an instance have fewer elements of a given type than the application requires.
            /// </summary>
            public static string TooFewDataElementsOfType => nameof(TooFewDataElementsOfType);
        }
        
        /// <summary>
        /// Represents unique codes for validation issues on the data element level. 
        /// </summary>
        public static class DataElementCodes
        {
            /// <summary>
            /// Gets a value that represents a validation issue where a data element is missing content type.
            /// </summary>
            public static string MissingContentType => nameof(MissingContentType);

            /// <summary>
            /// Gets a value that represents a validation issue where a data element has a content type that is not in the list of allowed content types.
            /// </summary>
            public static string ContentTypeNotAllowed => nameof(ContentTypeNotAllowed);

            /// <summary>
            /// Gets a value that represents a validation issue where a data element is too large for the given element type.
            /// </summary>
            public static string DataElementTooLarge => nameof(DataElementTooLarge);

            /// <summary>
            /// Gets a value that represents a validation issue where a data element has been validated at a process task different from expected.
            /// </summary>
            public static string DataElementValidatedAtWrongTask => nameof(DataElementValidatedAtWrongTask);
        }
    }
}
