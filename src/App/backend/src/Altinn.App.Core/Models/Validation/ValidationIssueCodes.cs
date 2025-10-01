namespace Altinn.App.Core.Models.Validation;

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

        /// <summary>
        /// Gets a value that represents a validation issue where the data element has a pending file virus scan.
        /// </summary>
        public static string DataElementFileScanPending => nameof(DataElementFileScanPending);

        /// <summary>
        /// Gets a value that represents a validation issue where the data element is infected with virus or malware of some form.
        /// </summary>
        public static string DataElementFileInfected => nameof(DataElementFileInfected);

        /// <summary>
        /// Gets a value that represents a validation issue where the data element has a file name that is not allowed.
        /// </summary>
        public static string InvalidFileNameFormat => nameof(InvalidFileNameFormat);

        /// <summary>
        /// Gets a value that represents a validation issue where the data element is missing a file name.
        /// </summary>
        public static string MissingFileName => nameof(MissingFileName);

        /// <summary>
        /// Gets a value that represents a validation issue where the data element does not contain all required signatures.
        /// </summary>
        public static string MissingSignatures => nameof(MissingSignatures);
    }
}
