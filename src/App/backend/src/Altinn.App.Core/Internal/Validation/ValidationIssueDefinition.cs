using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Core.Internal.Validation;

/// <summary>
/// Everything needed to create, translate and document one kind of validation issue.
/// </summary>
internal sealed class ValidationIssueDefinition
{
    /// <summary>
    /// The <see cref="ValidationIssue.Code"/> of the issue.
    /// </summary>
    public required string Code { get; init; }

    /// <summary>
    /// The <see cref="ValidationIssue.Severity"/> of the issue.
    /// </summary>
    public required ValidationIssueSeverity Severity { get; init; }

    /// <summary>
    /// When the issue is raised, for documentation.
    /// </summary>
    public required string Description { get; init; }

    /// <summary>
    /// The text of the issue, with its key, default texts and custom text parameters.
    /// </summary>
    public required BackendTextResource TextResource { get; init; }

    /// <summary>
    /// Creates an issue. <paramref name="values"/> are the custom text parameters, in the order of
    /// <see cref="BackendTextResource.CustomTextParameters"/>.
    /// </summary>
    public ValidationIssue Create(string? dataElementId, string? field, ReadOnlySpan<string?> values) =>
        new()
        {
            Code = Code,
            Severity = Severity,
            DataElementId = dataElementId,
            Field = field,
            CustomTextKey = TextResource.Key,
            CustomTextParameters = TextResource.CreateCustomTextParameters(values),
        };
}
