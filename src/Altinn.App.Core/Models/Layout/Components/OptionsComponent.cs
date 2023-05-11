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
    /// Alternaltive to <see cref="OptionId" /> where the options are sourced from a repeating group in the datamodel
    /// </summary>
    public OptionsSource? OptionsSource { get; }

    /// <summary>
    /// Is the component referencing a secure code list (uses security context of the instance)
    /// </summary>
    public bool Secure { get; }

    /// <summary>
    /// Constructor
    /// </summary>
    public OptionsComponent(string id, string type, IReadOnlyDictionary<string, string>? dataModelBindings, Expression? hidden, Expression? required, Expression? readOnly, string? optionId, List<AppOption>? options, OptionsSource? optionsSource, bool secure, IReadOnlyDictionary<string, string>? additionalProperties) :
        base(id, type, dataModelBindings, hidden, required, readOnly, additionalProperties)
    {
        OptionId = optionId;
        Options = options;
        OptionsSource = optionsSource;
        Secure = secure;
    }
}

/// <summary>
/// This is an optional child element of <see cref="OptionsComponent" /> that specifies that  
/// </summary>
public class OptionsSource
{
    /// <summary>
    /// Constructor for <see cref="OptionsSource" />
    /// </summary>
    public OptionsSource(string group, string label, string value)
    {
        Group = group;
        Label = label;
        Value = value;
    }
    /// <summary>
    /// the group field in the data model to base the options on
    /// </summary>
    public string Group { get; }
    /// <summary>
    /// a reference to a text id to be used as the label for each iteration of the group
    /// </summary>
    /// <remarks>
    /// As for the label property, we have to define a text resource that can be used as a label for each repetition of the group.
    /// This follows similar syntax as the value, and will also be familiar if you have used variables in text.
    /// </remarks>
    /// <example>
    /// The referenced text resource must use variables to read text from individual fields
    /// {
    ///     "language": "nb",
    ///     "resources": [
    ///         {
    ///         "id": "dropdown.label",
    ///         "value": "Person: {0}, Age: {1}",
    ///         "variables": [
    ///             {
    ///             "key": "some.group[{0}].name",
    ///             "dataSource": "dataModel.default"
    ///             },
    ///             {
    ///             "key": "some.group[{0}].age",
    ///             "dataSource": "dataModel.default"
    ///             }
    ///         ]
    ///         }
    ///     ]
    /// }
    /// </example>
    public string Label { get; }
    /// <summary>
    /// a reference to a field in the group that should be used as the option value. Notice that we set up this [{0}] syntax. Here the {0} will be replaced by each index of the group.
    /// </summary>
    /// <remarks>
    /// Notice that the value field must be unique for each element. If the repeating group does not contain a field which is unique for each item
    /// it is recommended to add a field to the data model that can be used as identificator, for instance a GUID.
    /// </remarks>
    public string Value { get; }
}