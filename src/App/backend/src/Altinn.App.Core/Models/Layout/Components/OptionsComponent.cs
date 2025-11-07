using System.Text.Json;

namespace Altinn.App.Core.Models.Layout.Components;

/// <summary>
/// Custom component for handeling the special fields that represents an option.
/// </summary>
public sealed class OptionsComponent : Base.NoReferenceComponent
{
    /// <summary>
    /// The ID that references <see cref="Altinn.App.Core.Features.IAppOptionsProvider.Id" /> and <see cref="Altinn.App.Core.Features.IInstanceAppOptionsProvider.Id" />
    /// </summary>
    public required string? OptionsId { get; init; }

    /// <summary>
    /// Alternaltive to <see cref="OptionsId" /> where the options are listed inline instead of referencing an external generator
    /// </summary>
    public required List<AppOption>? Options { get; init; }

    /// <summary>
    /// Alternaltive to <see cref="OptionsId" /> where the options are sourced from a repeating group in the datamodel
    /// </summary>
    public required OptionsSource? OptionsSource { get; init; }

    /// <summary>
    /// Is the component referencing a secure code list (uses security context of the instance)
    /// </summary>
    public required bool Secure { get; init; }

    /// <summary>
    /// Parser for OptionsComponent
    /// </summary>
    public static OptionsComponent Parse(JsonElement componentElement, string pageId, string layoutId)
    {
        var optionsId = ParseStringOrNull(componentElement, "optionsId");

        var options = ParseOrNull<List<AppOption>>(componentElement, "options");
        var optionsSource = ParseOrNull<OptionsSource>(componentElement, "source");
        var secure = ParseBoolOrNull(componentElement, "secure") ?? false;

        if (optionsId is null && options is null && optionsSource is null)
        {
            var id = ParseId(componentElement);
            throw new JsonException(
                $"\"optionsId\" or \"options\" or \"source\" is required on checkboxes, radiobuttons and dropdowns in component {layoutId}.{pageId}.{id}"
            );
        }
        if (optionsId is not null && options is not null)
        {
            throw new JsonException("\"optionsId\" and \"options\" can't both be specified");
        }
        if (optionsId is not null && optionsSource is not null)
        {
            throw new JsonException("\"optionsId\" and \"source\" can't both be specified");
        }
        if (optionsSource is not null && options is not null)
        {
            throw new JsonException("\"source\" and \"options\" can't both be specified");
        }
        if (options is not null && secure)
        {
            throw new JsonException("\"secure\": true is invalid for components with literal \"options\"");
        }
        if (optionsSource is not null && secure)
        {
            throw new JsonException(
                "\"secure\": true is invalid for components that reference a repeating group \"source\""
            );
        }

        return new OptionsComponent()
        {
            // BaseComponent properties
            Id = ParseId(componentElement),
            PageId = pageId,
            LayoutId = layoutId,
            Type = ParseType(componentElement),
            Required = ParseRequiredExpression(componentElement),
            ReadOnly = ParseReadOnlyExpression(componentElement),
            Hidden = ParseHiddenExpression(componentElement),
            RemoveWhenHidden = ParseRemoveWhenHiddenExpression(componentElement),
            DataModelBindings = ParseDataModelBindings(componentElement),
            TextResourceBindings = ParseTextResourceBindings(componentElement),
            // OptionsComponent properties
            Options = options,
            OptionsId = optionsId,
            OptionsSource = optionsSource,
            Secure = secure,
        };
    }

    private static string? ParseStringOrNull(JsonElement componentElement, string propertyName) =>
        componentElement.TryGetProperty(propertyName, out JsonElement optionsIdElement)
            ? optionsIdElement.GetString()
            : null;

    private static bool? ParseBoolOrNull(JsonElement componentElement, string propertyName) =>
        componentElement.TryGetProperty(propertyName, out JsonElement optionsIdElement)
            ? optionsIdElement.GetBoolean()
            : null;

    private static T? ParseOrNull<T>(JsonElement componentElement, string propertyName)
        where T : class =>
        componentElement.TryGetProperty(propertyName, out JsonElement optionsIdElement)
            ? optionsIdElement.Deserialize<T>()
            : null;
}

/// <summary>
/// This is an optional child element of <see cref="OptionsComponent" /> that specifies that
/// </summary>
public record OptionsSource
{
    /// <summary>
    /// Constructor for <see cref="OptionsSource" />
    /// </summary>
    public OptionsSource(string group, string value)
    {
        Group = group;
        Value = value;
    }

    /// <summary>
    /// the group field in the data model to base the options on
    /// </summary>
    public string Group { get; }

    /// <summary>
    /// a reference to a field in the group that should be used as the option value. Notice that we set up this [{0}] syntax. Here the {0} will be replaced by each index of the group.
    /// </summary>
    /// <remarks>
    /// Notice that the value field must be unique for each element. If the repeating group does not contain a field which is unique for each item
    /// it is recommended to add a field to the data model that can be used as identificator, for instance a GUID.
    /// </remarks>
    public string Value { get; }
}
