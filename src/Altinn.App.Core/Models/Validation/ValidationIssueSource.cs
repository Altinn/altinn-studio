namespace Altinn.App.Core.Models.Validation;

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

    /// <summary>
    /// Required field validation
    /// </summary>
    public static readonly string Custom = nameof(Custom);

    /// <summary>
    /// Expression validation
    /// </summary>
    public static readonly string Expression = nameof(Expression);

    /// <summary>
    /// Validation based on data annotations (json / xml schema)
    /// </summary>
    public static readonly string DataAnnotations = nameof(DataAnnotations);
}
