using System.Collections.Immutable;
using System.Text.Json;
using System.Text.Json.Serialization;

using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// Custom component for handeling the special fields that represents an option.
/// </summary>
public class OptionsComponent : BaseComponent
{
    /// <summary>
    /// The ID that references <see cref="Altinn.App.Core.Features.IAppOptionsProvider.Id" /> and <see cref="Altinn.App.Core.Features.IInstanceAppOptionsProvider.Id" />
    /// </summary>
    public string? OptionId { get; }

    /// <summary>
    /// Alternaltive to <see cref="OptionId" /> where the options are listed inline instead of referencing an external generator
    /// </summary>
    public List<AppOption>? Options { get; }

    /// <summary>
    /// Is the component referencing a secure code list (uses security context of the instance)
    /// </summary>
    public bool Secure { get; }

    /// <summary>
    /// Constructor
    /// </summary>
    public OptionsComponent(string id, string type, IReadOnlyDictionary<string, string>? dataModelBindings, Expression? hidden, Expression? required, Expression? readOnly, string? optionId, List<AppOption>? options, bool secure, IReadOnlyDictionary<string, string>? additionalProperties) :
        base(id, type, dataModelBindings, hidden, required, readOnly, additionalProperties)
    {
        OptionId = optionId;
        Options = options;
        Secure = secure;
    }
}

