using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Tests.LayoutExpressions.CommonTests;

public class ExpressionTestCaseRoot
{
    [JsonIgnore]
    public string? Filename { get; set; }

    [JsonIgnore]
    public string? FullPath { get; set; }

    [JsonIgnore]
    public string? Folder { get; set; }

    [JsonIgnore]
    public string? RawJson { get; set; }

    [JsonIgnore]
    public Exception? ParsingException { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("expression")]
    public Expression Expression { get; set; } = default!;

    [JsonPropertyName("context")]
    public ComponentContextForTestSpec? Context { get; set; } = default!;

    [JsonPropertyName("expects")]
    public JsonElement Expects { get; set; } = default!;

    [JsonPropertyName("expectsFailure")]
    public string? ExpectsFailure { get; set; }

    [JsonPropertyName("layouts")]
    [JsonConverter(typeof(LayoutModelConverterFromObject))]
    public LayoutModel ComponentModel { get; set; } = default!;

    [JsonPropertyName("dataModel")]
    public JsonElement? DataModel { get; set; }

    [JsonPropertyName("dataModels")]
    public List<DataModelAndElement>? DataModels { get; set; }

    [JsonPropertyName("frontendSettings")]
    public FrontEndSettings? FrontEndSettings { get; set; }

    [JsonPropertyName("instance")]
    public Instance? Instance { get; set; }

    [JsonPropertyName("gatewayAction")]
    public string? GatewayAction { get; set; }

    [JsonPropertyName("profileSettings")]
    public ProfileSettings? ProfileSettings { get; set; }

    public override string ToString()
    {
        return $"{Filename}: {Name}";
    }
}

public class DataModelAndElement
{
    [JsonPropertyName("dataElement")]
    public required DataElement DataElement { get; set; }

    [JsonPropertyName("data")]
    public required JsonElement Data { get; set; }
}

public class ProfileSettings
{
    [JsonPropertyName("language")]
    public string? Language { get; set; }
}

public class ComponentContextForTestSpec
{
    [JsonPropertyName("component")]
    public string ComponentId { get; set; } = default!;

    [JsonPropertyName("rowIndices")]
    public int[]? RowIndices { get; set; }

    [JsonPropertyName("currentLayout")]
    public string CurrentPageName { get; set; } = default!;

    [JsonPropertyName("children")]
    public IEnumerable<ComponentContextForTestSpec> ChildContexts { get; set; } =
        Enumerable.Empty<ComponentContextForTestSpec>();

    public ComponentContext ToContext(LayoutModel model)
    {
        return new ComponentContext(model.GetComponent(CurrentPageName, ComponentId), RowIndices, null);
    }

    public static ComponentContextForTestSpec FromContext(ComponentContext context)
    {
        ArgumentNullException.ThrowIfNull(context.Component);
        ArgumentNullException.ThrowIfNull(context.Component.Id);
        ArgumentNullException.ThrowIfNull(context.Component.PageId);

        return new ComponentContextForTestSpec
        {
            ComponentId = context.Component.Id,
            CurrentPageName = context.Component.PageId,
            ChildContexts =
                context.ChildContexts?.Select(c => FromContext(c)) ?? Enumerable.Empty<ComponentContextForTestSpec>(),
            RowIndices = context.RowIndices
        };
    }
}
