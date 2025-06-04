using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
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
    public Expression Expression { get; set; }

    [JsonPropertyName("context")]
    public ComponentContextForTestSpec? Context { get; set; }

    [JsonPropertyName("expects")]
    public JsonElement Expects { get; set; }

    [JsonPropertyName("expectsFailure")]
    public string? ExpectsFailure { get; set; }

    public class TestCaseItem
    {
        [JsonPropertyName("expression")]
        public required Expression Expression { get; set; }

        [JsonPropertyName("expects")]
        public JsonElement Expects { get; set; }

        [JsonPropertyName("expectsFailure")]
        public string? ExpectsFailure { get; set; }
    }

    [JsonPropertyName("testCases")]
    public List<TestCaseItem>? TestCases { get; set; }

    [JsonPropertyName("layouts")]
    [JsonConverter(typeof(LayoutModelConverterFromObject))]
    public IReadOnlyDictionary<string, PageComponent>? Layouts { get; set; }

    [JsonPropertyName("dataModel")]
    public JsonElement? DataModel { get; set; }

    [JsonPropertyName("dataModels")]
    public List<DataModelAndElement>? DataModels { get; set; }

    [JsonPropertyName("frontendSettings")]
    public FrontEndSettings? FrontEndSettings { get; set; }

    [JsonPropertyName("textResources")]
    public List<TextResourceElement>? TextResources { get; set; }

    [JsonPropertyName("instance")]
    public Instance Instance { get; set; } = new Instance();

    [JsonPropertyName("gatewayAction")]
    public string? GatewayAction { get; set; }

    [JsonPropertyName("profileSettings")]
    public ProfileSettings? ProfileSettings { get; set; }

    [JsonPropertyName("positionalArguments")]
    public List<JsonElement>? PositionalArguments { get; set; }

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

    public ComponentContext ToContext(LayoutModel? model, LayoutEvaluatorState state)
    {
        var component = model?.GetComponent(CurrentPageName, ComponentId);
        return new ComponentContext(
            component,
            RowIndices,
            // TODO: get from data model, but currently not important for tests
            state.GetDefaultDataElementId(),
            ChildContexts.Select(c => c.ToContext(model, state)).ToList()
        );
    }

    public static ComponentContextForTestSpec FromContext(ComponentContext context)
    {
        ArgumentNullException.ThrowIfNull(context.Component);
        ArgumentNullException.ThrowIfNull(context.Component.Id);
        ArgumentNullException.ThrowIfNull(context.Component.PageId);
        var id = context.Component.Id;

        // Remove guid from the end of the id
        if (Regex.IsMatch(id, @".*_[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}"))
        {
            id = id.Substring(0, id.LastIndexOf('_'));
        }

        return new ComponentContextForTestSpec
        {
            ComponentId = id,
            CurrentPageName = context.Component.PageId,
            ChildContexts = context.ChildContexts?.Select(FromContext) ?? [],
            RowIndices = context.RowIndices,
        };
    }
}
