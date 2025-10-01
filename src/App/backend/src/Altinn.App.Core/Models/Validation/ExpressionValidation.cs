using System.Text.Json.Serialization;
using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models.Validation;

/// <summary>
/// Resolved expression validation
/// </summary>
public class ExpressionValidation
{
    /// <inheritdoc/>
    public Expression Message { get; set; }

    /// <inheritdoc/>
    public Expression Condition { get; set; }

    /// <inheritdoc/>
    public ValidationIssueSeverity? Severity { get; set; }
}

/// <summary>
/// Raw expression validation or definition from the validation configuration file
/// </summary>
public class RawExpressionValidation
{
    /// <inheritdoc/>
    public Expression? Message { get; set; }

    /// <inheritdoc/>
    public Expression? Condition { get; set; }

    /// <inheritdoc/>
    [JsonConverter(typeof(FrontendSeverityConverter))]
    public ValidationIssueSeverity? Severity { get; set; }

    /// <inheritdoc/>
    public string? Ref { get; set; }
}
