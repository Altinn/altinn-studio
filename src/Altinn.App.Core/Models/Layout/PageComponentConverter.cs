using System.Diagnostics.CodeAnalysis;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Altinn.App.Core.Helpers.Extensions;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout.Components;

namespace Altinn.App.Core.Models.Layout;

/// <summary>
/// Custom converter for parsing Layout files in json format to <see cref="LayoutModel" />
/// </summary>
/// <remarks>
/// The layout files in json format contains lots of polymorphism witch is hard for the
/// standard json parser to convert to an object graph. Using <see cref="Utf8JsonReader"/>
/// directly I can convert to a more suitable C# representation directly
/// </remarks>
public class PageComponentConverter : JsonConverter<PageComponent>
{
    private static readonly AsyncLocal<(string layoutId, string pageName)?> _asyncLocal = new();

    /// <summary>
    /// Store pageName to be used for deserialization
    /// </summary>
    /// <remarks>
    /// JsonSerializer does not support passing additional arguments for deserialization, and we
    /// need the pageName to be part of the PageCompoenent at construction time to ensure nullability rules
    ///
    /// This uses a AsyncLocal to pass the pageName as an additional parameter
    /// </remarks>
    public static void SetAsyncLocalPageName(string layoutId, string pageName)
    {
        _asyncLocal.Value = (layoutId, pageName);
    }

    /// <inheritdoc />
    public override PageComponent Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        // Try to get pagename from metadata in this.AddPageName
        var pageName = _asyncLocal.Value?.pageName ?? "UnknownPageName";
        var layoutId = _asyncLocal.Value?.layoutId ?? "UnknownLayoutSetId";

        _asyncLocal.Value = null;

        return ReadNotNull(ref reader, pageName, layoutId, options);
    }

    /// <summary>
    /// Similar to read, but not nullable, and no pageName hack.
    /// </summary>
    public static PageComponent ReadNotNull(
        ref Utf8JsonReader reader,
        string pageName,
        string layoutId,
        JsonSerializerOptions options
    )
    {
        if (reader.TokenType != JsonTokenType.StartObject)
        {
            throw new JsonException(
                $"Unexpected JSON token type '{reader.TokenType}', expected '{nameof(JsonTokenType.StartObject)}'"
            );
        }
        PageComponent? page = null;

        while (reader.Read() && reader.TokenType != JsonTokenType.EndObject)
        {
            if (reader.TokenType != JsonTokenType.PropertyName)
            {
                // Think this is impossible. After a JsonTokenType.StartObject, everything should be JsonTokenType.PropertyName
                throw new JsonException(
                    $"Unexpected JSON token type after StartObject: '{reader.TokenType}', expected '{nameof(JsonTokenType.PropertyName)}'"
                );
            }

            var propertyName = reader.GetString();
            reader.Read();
            if (propertyName == "data")
            {
                page = ReadData(ref reader, pageName, layoutId, options);
            }
            else
            {
                // Ignore other properties than "data"
                reader.Skip();
            }
        }
        if (page is null)
        {
            throw new JsonException("Missing property \"data\" on layout page");
        }
        return page;
    }

    private static PageComponent ReadData(
        ref Utf8JsonReader reader,
        string pageName,
        string layoutId,
        JsonSerializerOptions options
    )
    {
        if (reader.TokenType != JsonTokenType.StartObject)
        {
            throw new JsonException(
                $"Unexpected JSON token type '{reader.TokenType}', expected '{nameof(JsonTokenType.StartObject)}'"
            );
        }

        List<BaseComponent>? componentListFlat = null;
        Dictionary<string, BaseComponent>? componentLookup = null;
        Dictionary<string, GroupComponent>? childToGroupMapping = null;

        // Hidden is the only property that cascades.
        Expression? hidden = null;
        Expression? required = null;
        Expression? readOnly = null;

        // extra properties that are not stored in a specific class.
        Dictionary<string, string> additionalProperties = new();

        while (reader.Read() && reader.TokenType != JsonTokenType.EndObject)
        {
            if (reader.TokenType != JsonTokenType.PropertyName)
            {
                // Think this is impossible. After a JsonTokenType.StartObject, everything should be JsonTokenType.PropertyName
                throw new JsonException(
                    $"Unexpected JSON token type after StartObject: '{reader.TokenType}', expected '{nameof(JsonTokenType.PropertyName)}'"
                );
            }

            var propertyName =
                reader.GetString()
                ?? throw new JsonException(
                    $"Could not read property name from JSON token with type '{nameof(JsonTokenType.PropertyName)}'"
                );

            reader.Read();
            switch (propertyName.ToLowerInvariant())
            {
                case "layout":
                    (componentListFlat, componentLookup, childToGroupMapping) = ReadLayout(ref reader, options);
                    break;
                case "hidden":
                    hidden = ExpressionConverter.ReadStatic(ref reader, options);
                    break;
                case "required":
                    required = ExpressionConverter.ReadStatic(ref reader, options);
                    break;
                case "readonly":
                    readOnly = ExpressionConverter.ReadStatic(ref reader, options);
                    break;
                default:
                    // read extra properties
                    additionalProperties[propertyName] = reader.SkipReturnString();
                    break;
            }
        }

        if (componentListFlat is null || componentLookup is null || childToGroupMapping is null)
        {
            throw new JsonException("Missing property \"layout\" on layout page");
        }

        var layout = ProcessLayout(componentListFlat, componentLookup, childToGroupMapping);

        return new PageComponent(
            pageName,
            layoutId,
            layout,
            componentLookup,
            hidden ?? Expression.False,
            required ?? Expression.False,
            readOnly ?? Expression.False,
            additionalProperties
        );
    }

    private static (
        List<BaseComponent>,
        Dictionary<string, BaseComponent>,
        Dictionary<string, GroupComponent>
    ) ReadLayout(ref Utf8JsonReader reader, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.StartArray)
        {
            throw new JsonException();
        }

        var componentListFlat = new List<BaseComponent>();
        var componentLookup = new Dictionary<string, BaseComponent>();
        var childToGroupMapping = new Dictionary<string, GroupComponent>();

        while (reader.Read() && reader.TokenType != JsonTokenType.EndArray)
        {
            var component = ReadComponent(ref reader, options);

            // Add component to the collections
            componentListFlat.Add(component);
            AddToComponentLookup(component, componentLookup);
            if (component is GroupComponent groupComponent)
            {
                AddChildrenToMapping(groupComponent, groupComponent.ChildIDs, childToGroupMapping);
            }
        }

        return (componentListFlat, componentLookup, childToGroupMapping);
    }

    private static List<BaseComponent> ProcessLayout(
        List<BaseComponent> componentListFlat,
        Dictionary<string, BaseComponent> componentLookup,
        Dictionary<string, GroupComponent> childToGroupMapping
    )
    {
        var layout = new List<BaseComponent>();
        foreach (var component in componentListFlat)
        {
            if (component is GroupComponent groupComponent)
            {
                foreach (var childID in groupComponent.ChildIDs)
                {
                    if (!componentLookup.TryGetValue(childID, out var child))
                    {
                        throw new InvalidOperationException(
                            $"""Group "{component.Id}" references a child with id \"{childID}\" which was not found in layout"""
                        );
                    }

                    groupComponent.AddChild(child);
                }
            }

            if (!childToGroupMapping.ContainsKey(component.Id))
            {
                layout.Add(component);
            }
        }
        return layout;
    }

    private static void AddToComponentLookup(BaseComponent component, Dictionary<string, BaseComponent> componentLookup)
    {
        if (!componentLookup.TryAdd(component.Id, component))
        {
            throw new JsonException($"Duplicate key \"{component.Id}\" detected");
        }
    }

    private static readonly Regex _multiPageIndexRegex = new Regex(
        @"^(\d+:)?([^\s:]+)$",
        RegexOptions.None,
        TimeSpan.FromSeconds(1)
    );

    private static string GetIdWithoutMultiPageIndex(string id)
    {
        var match = _multiPageIndexRegex.Match(id);
        return match.Groups[2].Value;
    }

    private static void AddChildrenToMapping(
        GroupComponent component,
        IEnumerable<string> children,
        Dictionary<string, GroupComponent> childToGroupMapping
    )
    {
        foreach (var childId in children)
        {
            if (childToGroupMapping.TryGetValue(childId, out var existingMapping))
            {
                throw new JsonException(
                    $"Component \"{component.Id}\" tried to claim \"{childId}\" as a child, but that child is already claimed by \"{existingMapping.Id}\""
                );
            }
            childToGroupMapping[childId] = component;
        }
    }

    private static BaseComponent ReadComponent(ref Utf8JsonReader reader, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.StartObject)
        {
            throw new JsonException(
                $"Unexpected JSON token type '{reader.TokenType}', expected '{nameof(JsonTokenType.StartObject)}'"
            );
        }
        string? id = null;
        string? type = null;
        Dictionary<string, ModelBinding>? dataModelBindings = null;
        Expression? hidden = null;
        Expression? hiddenRow = null;
        Expression? required = null;
        Expression? readOnly = null;
        // Custom properities for group
        List<string>? childIDs = null;
        int maxCount = 1; // > 1 is repeating, but might not be specified for non-repeating groups
        // Custom properties for Summary
        string? componentRef = null;
        // Custom properties for components with optionId or literal options
        string? optionId = null;
        List<AppOption>? literalOptions = null;
        OptionsSource? optionsSource = null;
        bool secure = false;
        // Custom properties for subform
        string? layoutSetId = null;
        // List<SubFormComponent.TableColumn>? tableColumns = null;
        // bool showAddButton = true;
        // bool showDeleteButton = true;

        // extra properties that are not stored in a specific class.
        Dictionary<string, string> additionalProperties = new();

        while (reader.Read() && reader.TokenType != JsonTokenType.EndObject)
        {
            if (reader.TokenType != JsonTokenType.PropertyName)
            {
                // Think this is impossible. After a JsonTokenType.StartObject, everything should be JsonTokenType.PropertyName
                throw new JsonException(
                    $"Unexpected JSON token type after StartObject: '{reader.TokenType}', expected '{nameof(JsonTokenType.PropertyName)}'"
                );
            }

            var propertyName =
                reader.GetString()
                ?? throw new JsonException(
                    $"Could not read property name from JSON token with type '{nameof(JsonTokenType.PropertyName)}'"
                );

            reader.Read();
            switch (propertyName.ToLowerInvariant())
            {
                case "id":
                    id = reader.GetString();
                    break;
                case "type":
                    type = reader.GetString();
                    break;
                case "datamodelbindings":
                    dataModelBindings = DeserializeModelBindings(ref reader, options);
                    break;
                // case "textresourcebindings":
                //     break;
                case "children":
                    childIDs = JsonSerializer
                        .Deserialize<List<string>>(ref reader, options)
                        ?.Select(GetIdWithoutMultiPageIndex)
                        .ToList();
                    break;
                case "rows":
                    childIDs = GridConfig.ReadGridChildren(ref reader, options);
                    break;
                case "maxcount":
                    maxCount = reader.GetInt32();
                    break;
                case "hidden":
                    hidden = ExpressionConverter.ReadStatic(ref reader, options);
                    break;
                case "hiddenrow":
                    hiddenRow = ExpressionConverter.ReadStatic(ref reader, options);
                    break;
                case "required":
                    required = ExpressionConverter.ReadStatic(ref reader, options);
                    break;
                case "readonly":
                    readOnly = ExpressionConverter.ReadStatic(ref reader, options);
                    break;
                // summary
                case "componentref":
                    componentRef = reader.GetString();
                    break;
                // option
                case "optionsid":
                    optionId = reader.GetString();
                    break;
                case "options":
                    literalOptions = JsonSerializer.Deserialize<List<AppOption>>(ref reader, options);
                    break;
                case "source":
                    optionsSource = JsonSerializer.Deserialize<OptionsSource>(ref reader, options);
                    break;
                case "secure":
                    secure = reader.TokenType == JsonTokenType.True;
                    break;
                // subform
                case "layoutset":
                    layoutSetId = reader.GetString();
                    break;
                // case "tablecolumns":
                //     tableColumns = JsonSerializer.Deserialize<List<SubFormComponent.TableColumn>>(ref reader, options);
                //     break;
                // case "showaddbutton":
                //     showAddButton = reader.TokenType != JsonTokenType.False;
                //     break;
                // case "showdeletebutton":
                //     showDeleteButton = reader.TokenType != JsonTokenType.False;
                //     break;
                default:
                    // store extra fields as json
                    additionalProperties[propertyName] = reader.SkipReturnString();
                    break;
            }
        }
        ThrowJsonExceptionIfNull(id);
        ThrowJsonExceptionIfNull(type);

        switch (type.ToLowerInvariant())
        {
            case "repeatinggroup":
                if (!(dataModelBindings?.ContainsKey("group") ?? false))
                {
                    throw new JsonException(
                        $"A repeating group id:\"{id}\" does not have a \"group\" dataModelBinding"
                    );
                }

                var directRepComponent = new RepeatingGroupComponent(
                    id,
                    type,
                    dataModelBindings,
                    new List<BaseComponent>(),
                    childIDs
                        ?? throw new JsonException(
                            "Component with \"type\": \"Group\" requires a \"children\" property"
                        ),
                    maxCount,
                    hidden ?? Expression.False,
                    hiddenRow ?? Expression.False,
                    required ?? Expression.False,
                    readOnly ?? Expression.False,
                    additionalProperties
                );
                return directRepComponent;

            case "group":
                ThrowJsonExceptionIfNull(
                    childIDs,
                    "Component with \"type\": \"Group\" requires a \"children\" property"
                );

                if (maxCount > 1)
                {
                    if (!(dataModelBindings?.ContainsKey("group") ?? false))
                    {
                        throw new JsonException(
                            $"A group id:\"{id}\" with maxCount: {maxCount} does not have a \"group\" dataModelBinding"
                        );
                    }

                    var repComponent = new RepeatingGroupComponent(
                        id,
                        type,
                        dataModelBindings,
                        new List<BaseComponent>(),
                        childIDs,
                        maxCount,
                        hidden ?? Expression.False,
                        hiddenRow ?? Expression.False,
                        required ?? Expression.False,
                        readOnly ?? Expression.False,
                        additionalProperties
                    );
                    return repComponent;
                }
                else
                {
                    var groupComponent = new GroupComponent(
                        id,
                        type,
                        dataModelBindings,
                        new List<BaseComponent>(),
                        childIDs,
                        hidden ?? Expression.False,
                        required ?? Expression.False,
                        readOnly ?? Expression.False,
                        additionalProperties
                    );
                    return groupComponent;
                }
            case "grid":
                var gridComponent = new GridComponent(
                    id,
                    type,
                    dataModelBindings,
                    new List<BaseComponent>(),
                    childIDs,
                    hidden ?? Expression.False,
                    required ?? Expression.False,
                    readOnly ?? Expression.False,
                    additionalProperties
                );
                return gridComponent;
            case "summary":
                return new SummaryComponent(
                    id,
                    type,
                    hidden ?? Expression.False,
                    componentRef
                        ?? throw new JsonException(
                            "Component with \"type\": \"Summary\" requires the \"componentRef\" property"
                        ),
                    additionalProperties
                );
            case "checkboxes":
            case "radiobuttons":
            case "dropdown":
                ValidateOptions(optionId, literalOptions, optionsSource, secure);
                return new OptionsComponent(
                    id,
                    type,
                    dataModelBindings,
                    hidden ?? Expression.False,
                    required ?? Expression.False,
                    readOnly ?? Expression.False,
                    optionId,
                    literalOptions,
                    optionsSource,
                    secure,
                    additionalProperties
                );
            case "subform":
                return new SubFormComponent(
                    id,
                    type,
                    dataModelBindings,
                    layoutSetId ?? throw new JsonException("Subform requires a layoutSetId"),
                    // tableColumns ?? new(),
                    // showAddButton,
                    // showDeleteButton,
                    hidden ?? Expression.False,
                    required ?? Expression.False,
                    readOnly ?? Expression.False,
                    additionalProperties
                );
        }

        // Most components are handled as BaseComponent
        return new BaseComponent(
            id,
            type,
            dataModelBindings,
            hidden ?? Expression.False,
            required ?? Expression.False,
            readOnly ?? Expression.False,
            additionalProperties
        );
    }

    private static Dictionary<string, ModelBinding> DeserializeModelBindings(
        ref Utf8JsonReader reader,
        JsonSerializerOptions options
    )
    {
        var modelBindings = new Dictionary<string, ModelBinding>();
        if (reader.TokenType != JsonTokenType.StartObject)
        {
            throw new JsonException("Expected StartObject token for \"dataModelBindings\"");
        }

        while (reader.Read() && reader.TokenType != JsonTokenType.EndObject)
        {
            if (reader.TokenType != JsonTokenType.PropertyName)
            {
                throw new JsonException();
            }

            // ! Token type is PropertyName so value is a string
            var propertyName = reader.GetString()!;
            reader.Read();
            modelBindings[propertyName] = reader.TokenType switch
            {
                JsonTokenType.String => new ModelBinding { Field = reader.GetString() ?? throw new JsonException() },
                JsonTokenType.StartObject => JsonSerializer.Deserialize<ModelBinding>(ref reader, options),
                _ => throw new JsonException(),
            };
        }

        return modelBindings;
    }

    private static void ValidateOptions(
        string? optionId,
        List<AppOption>? literalOptions,
        OptionsSource? optionsSource,
        bool secure
    )
    {
        if (optionId is null && literalOptions is null && optionsSource is null)
        {
            throw new JsonException(
                "\"optionId\" or \"options\" or \"source\" is required on checkboxes, radiobuttons and dropdowns"
            );
        }
        if (optionId is not null && literalOptions is not null)
        {
            throw new JsonException("\"optionId\" and \"options\" can't both be specified");
        }
        if (optionId is not null && optionsSource is not null)
        {
            throw new JsonException("\"optionId\" and \"source\" can't both be specified");
        }
        if (optionsSource is not null && literalOptions is not null)
        {
            throw new JsonException("\"source\" and \"options\" can't both be specified");
        }
        if (literalOptions is not null && secure)
        {
            throw new JsonException("\"secure\": true is invalid for components with literal \"options\"");
        }
        if (optionsSource is not null && secure)
        {
            throw new JsonException(
                "\"secure\": true is invalid for components that reference a repeating group \"source\""
            );
        }
    }

    /// <summary>
    /// Utility method to recduce so called Coginitve Complexity by writing if in the meth
    /// </summary>
    private static void ThrowJsonExceptionIfNull(
        [NotNull] object? obj,
        string? message = null,
        [CallerArgumentExpression("obj")] string? propertyName = null
    )
    {
        if (obj is null)
        {
            throw new JsonException(message ?? $"\"{propertyName}\" property of component should not be null");
        }
    }

    /// <inheritdoc />
    public override void Write(Utf8JsonWriter writer, PageComponent value, JsonSerializerOptions options)
    {
        throw new NotImplementedException();
    }
}
