using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models;

/// <summary>
/// Resolved data field calculation
/// </summary>
internal sealed class DataModelFieldCalculation
{
    /// <summary>
    /// Expression to evaluate
    /// </summary>
    public required Expression Expression { get; set; }
}

/// <summary>
/// Raw value calculation expression from the calculation configuration file
/// </summary>
internal sealed class RawDataModelFieldCalculation
{
    /// <summary>
    /// Expression to evaluate
    /// </summary>
    public Expression? Expression { get; set; }
}
