
namespace Altinn.App.Core.Models.Validation
{
    /// <summary>
    /// Specifies the source of a validation issue
    /// </summary>
    public static class ValidationIssueSources
    {
        /// <summary>
        /// File attachment validation
        /// </summary>
        public static readonly string File = nameof(File);

        /// <summary>
        /// Data model validation
        /// </summary>
        public static readonly string ModelState = nameof(ModelState);

        /// <summary>
        /// Required field validation
        /// </summary>
        public static readonly string Required = nameof(Required);
    }
}
