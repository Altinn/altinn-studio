using System.Collections.Immutable;
using System.Text.Json;
using Altinn.App.Core.Models.Expressions;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// Inteface to be able to handle all most components same way.
/// </summary>
/// <remarks>
/// See <see cref="GroupComponent" /> for any components that handle children.
/// Includes <see cref="DataModelBindings" /> that will be initialized to an empty dictionary
/// for components that don't have them.
/// </remarks>
public class BaseComponent
{
    /// <summary>
    /// Constructor for <see cref="BaseComponent" />
    /// </summary>
    public BaseComponent(
        string id,
        string type,
        IReadOnlyDictionary<string, string>? dataModelBindings,
        Expression? hidden,
        Expression? required,
        Expression? readOnly,
        IReadOnlyDictionary<string, string>? additionalProperties
    )
    {
        Id = id;
        Type = type;
        DataModelBindings = dataModelBindings ?? ImmutableDictionary<string, string>.Empty;
        Hidden = hidden;
        Required = required;
        ReadOnly = readOnly;
        AdditionalDebugProperties = additionalProperties;
    }

    /// <summary>
    /// ID of the component (or pagename for pages)
    /// </summary>
    public string Id { get; }

    /// <summary>
    /// Get the page for the component
    /// </summary>
    public string PageId
    {
        get
        {
            //Get the Id of the first component without a parent.
            return Parent?.PageId ?? Id;
        }
    }

    /// <summary>
    /// Component type as written in the json file
    /// </summary>
    public string Type { get; }

    /// <summary>
    /// Layout Expression that can be evaluated to see if component should be hidden
    /// </summary>
    public Expression? Hidden { get; }

    /// <summary>
    /// Layout Expression that can be evaluated to see if component should be required
    /// </summary>
    public Expression? Required { get; }

    /// <summary>
    /// Layout Expression that can be evaluated to see if component should be read only
    /// </summary>
    public Expression? ReadOnly { get; }

    /// <summary>
    /// Data model bindings for the component or group
    /// </summary>
    public IReadOnlyDictionary<string, string> DataModelBindings { get; }

    /// <summary>
    /// The group or page that this component is part of. NULL for page components
    /// </summary>
    public BaseComponent? Parent { get; internal set; }

    /// <summary>
    /// Extra properties that are not modelled explicitly as a class that inhertits from <see cref="BaseComponent" />.
    /// value is a JSON serialized string. It is intended for debugging
    /// </summary>
    public IReadOnlyDictionary<string, string>? AdditionalDebugProperties { get; }
}
