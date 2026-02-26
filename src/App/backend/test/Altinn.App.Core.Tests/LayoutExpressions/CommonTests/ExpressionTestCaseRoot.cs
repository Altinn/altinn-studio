using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Expressions;
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
    public IReadOnlyDictionary<string, JsonElement>? Layouts { get; set; }

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

    public async Task<ComponentContext> GetContextOrNull(LayoutEvaluatorState state)
    {
        ComponentContext? context = null;
        if (Context is not null)
        {
            //! Some tests do not need context, but it is not nullable in expression evaluator
            context = await state.GetComponentContext(
                Context.CurrentPageName,
                Context.ComponentId,
                Context.RowIndices
            )!;
        }

        //! Some tests do not need context, but it is not nullable in expression evaluator
        return context!;
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
    public required string ComponentId { get; init; }

    [JsonPropertyName("rowIndices")]
    public int[]? RowIndices { get; init; }

    [JsonPropertyName("currentLayout")]
    public required string CurrentPageName { get; init; }

    [JsonPropertyName("children")]
    public List<ComponentContextForTestSpec> ChildContexts { get; init; } = [];

    public static ComponentContextForTestSpec FromContext(ComponentContext context)
    {
        ArgumentNullException.ThrowIfNull(context.Component);
        ArgumentNullException.ThrowIfNull(context.Component.Id);
        ArgumentNullException.ThrowIfNull(context.Component.PageId);
        var id = context.Component.Id;

        List<ComponentContextForTestSpec> childContexts = context
            .ChildContexts.SelectMany(c => c.Component is RepeatingGroupRowComponent ? c.ChildContexts : [c]) // Flatten out the synthetic Row components that are not used in test spec
            .Select(FromContext)
            .ToList();

        return new ComponentContextForTestSpec
        {
            ComponentId = id,
            CurrentPageName = context.Component.PageId,
            ChildContexts = childContexts,
            RowIndices = context.RowIndices,
        };
    }
}
