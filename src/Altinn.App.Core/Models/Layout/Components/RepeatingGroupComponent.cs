using System.Collections.Immutable;
using System.Text.Json;
using System.Text.Json.Serialization;

using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// Component specialisation for repeating groups with maxCount > 1
/// </summary>
public class RepeatingGroupComponent : GroupComponent
{
    /// <summary>
    /// Constructor for RepeatingGroupComponent
    /// </summary>
    public RepeatingGroupComponent(string id, string type, IReadOnlyDictionary<string, string>? dataModelBindings, IEnumerable<BaseComponent> children, int maxCount, Expression? hidden, Expression? required, Expression? readOnly, IReadOnlyDictionary<string, string>? additionalProperties) :
        base(id, type, dataModelBindings, children, hidden, required, readOnly, additionalProperties)
    {
        MaxCount = maxCount;
    }

    /// <summary>
    /// Maximum number of repeatitions of this repating group
    /// </summary>
    public int MaxCount { get; }
}