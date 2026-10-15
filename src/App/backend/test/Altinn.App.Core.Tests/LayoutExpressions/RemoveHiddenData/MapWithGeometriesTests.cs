using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.App.Tests.Common.Fixtures;
using Altinn.Platform.Storage.Interface.Models;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.LayoutExpressions.RemoveHiddenData;

public class MapWithGeometriesTests
{
    private readonly MockedServiceCollection _collection;
    private readonly DataType _dataType;
    private readonly ITestOutputHelper _outputHelper;

    public class SkjemaModel
    {
        [JsonPropertyName("location")]
        public string? Location { get; set; }

        [JsonPropertyName("geometries")]
        public List<GeometryRow>? Geometries { get; set; }

        [JsonPropertyName("hideMap")]
        public bool HideMap { get; set; }

        [JsonPropertyName("hideGroup")]
        public bool HideGroup { get; set; }

        [JsonPropertyName("keepMapData")]
        public bool KeepMapData { get; set; }
    }

    public class GeometryRow
    {
        [JsonPropertyName("data")]
        public string? Data { get; set; }

        [JsonPropertyName("label")]
        public string? Label { get; set; }

        [JsonPropertyName("isEditable")]
        public bool? IsEditable { get; set; }

        [JsonPropertyName("comment")]
        public string? Comment { get; set; }

        // Only bound through the frontend default "style" property (no geometryStyle binding in the layout)
        [JsonPropertyName("style")]
        public string? Style { get; set; }
    }

    public MapWithGeometriesTests(ITestOutputHelper outputHelper)
    {
        _outputHelper = outputHelper;
        _collection = new MockedServiceCollection { OutputHelper = outputHelper };
        _dataType = _collection.AddDataType<SkjemaModel>();

        _collection.AddLayoutSet(
            _dataType,
            """
            {
                "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
                "data": {
                    "layout": [
                        {
                            "id": "map",
                            "type": "Map",
                            "textResourceBindings": {
                                "title": "Velg område"
                            },
                            "dataModelBindings": {
                                "simpleBinding": "location",
                                "geometries": "geometries",
                                "geometryData": "geometries.data",
                                "geometryLabel": "geometries.label",
                                "geometryIsEditable": "geometries.isEditable"
                            },
                            "toolbar": {
                                "polygon": true,
                                "marker": true
                            },
                            "hidden": ["dataModel", "hideMap"],
                            "removeWhenHidden": ["not", ["dataModel", "keepMapData"]]
                        },
                        {
                            "id": "group",
                            "type": "RepeatingGroup",
                            "dataModelBindings": {
                                "group": "geometries"
                            },
                            "maxCount": 5,
                            "children": ["comment"],
                            "hidden": ["dataModel", "hideGroup"]
                        },
                        {
                            "id": "comment",
                            "type": "Input",
                            "dataModelBindings": {
                                "simpleBinding": "geometries.comment"
                            }
                        }
                    ]
                }
            }
            """
        );
    }

    private static SkjemaModel CreateModel(bool hideMap, bool hideGroup) =>
        new()
        {
            Location = "59.9,10.7",
            Geometries =
            [
                new GeometryRow
                {
                    Data = "POINT (10.7 59.9)",
                    Label = "label0",
                    IsEditable = true,
                    Comment = "comment0",
                },
                new GeometryRow
                {
                    Data = "POINT (10.8 59.8)",
                    Label = "label1",
                    IsEditable = false,
                    Comment = "comment1",
                },
            ],
            HideMap = hideMap,
            HideGroup = hideGroup,
        };

    [Fact]
    public async Task HiddenMap_RemovesLocationAndGeometries()
    {
        await using var provider = _collection.BuildServiceProvider();
        var dataMutator = await provider.CreateInstanceDataUnitOfWork(
            CreateModel(hideMap: true, hideGroup: true),
            _dataType,
            null
        );

        var state = dataMutator.GetLayoutEvaluatorState();
        Assert.NotNull(state);
        var fieldsToRemove = await LayoutEvaluator.GetHiddenFieldsForRemoval(state, evaluateRemoveWhenHidden: false);
        AssertEqualSets(
            [
                "location",
                "geometries",
                "geometries[0]",
                "geometries[0].data",
                "geometries[0].label",
                "geometries[0].isEditable",
                "geometries[0].style",
                "geometries[0].comment",
                "geometries[1]",
                "geometries[1].data",
                "geometries[1].label",
                "geometries[1].isEditable",
                "geometries[1].style",
                "geometries[1].comment",
            ],
            fieldsToRemove.Select(d => d.Field)
        );

        var cleanData = await dataMutator.GetCleanAccessor().GetFormData<SkjemaModel>();
        Assert.NotNull(cleanData);
        Assert.Null(cleanData.Location);
        Assert.Null(cleanData.Geometries);

        // The original data is untouched
        var currentData = await dataMutator.GetFormData<SkjemaModel>();
        Assert.NotNull(currentData);
        Assert.Equal("59.9,10.7", currentData.Location);
        Assert.NotNull(currentData.Geometries);
        Assert.Equal(2, currentData.Geometries.Count);
    }

    [Fact]
    public async Task VisibleMap_ProtectsRowsWhenGroupIsHidden()
    {
        await using var provider = _collection.BuildServiceProvider();
        var dataMutator = await provider.CreateInstanceDataUnitOfWork(
            CreateModel(hideMap: false, hideGroup: true),
            _dataType,
            null
        );

        var state = dataMutator.GetLayoutEvaluatorState();
        Assert.NotNull(state);
        var fieldsToRemove = await LayoutEvaluator.GetHiddenFieldsForRemoval(state, evaluateRemoveWhenHidden: false);
        AssertEqualSets(["geometries[0].comment", "geometries[1].comment"], fieldsToRemove.Select(d => d.Field));

        var cleanData = await dataMutator.GetCleanAccessor().GetFormData<SkjemaModel>();
        Assert.NotNull(cleanData);
        Assert.Equal("59.9,10.7", cleanData.Location);
        Assert.NotNull(cleanData.Geometries);
        Assert.Equal(2, cleanData.Geometries.Count);
        Assert.Equal("POINT (10.7 59.9)", cleanData.Geometries[0].Data);
        Assert.Equal("label0", cleanData.Geometries[0].Label);
        Assert.True(cleanData.Geometries[0].IsEditable);
        Assert.Null(cleanData.Geometries[0].Comment);
        Assert.Equal("POINT (10.8 59.8)", cleanData.Geometries[1].Data);
        Assert.Null(cleanData.Geometries[1].Comment);
    }

    [Fact]
    public async Task HiddenMap_RemovesRowFieldsButKeepsRowsWhenGroupIsVisible()
    {
        await using var provider = _collection.BuildServiceProvider();
        var dataMutator = await provider.CreateInstanceDataUnitOfWork(
            CreateModel(hideMap: true, hideGroup: false),
            _dataType,
            null
        );

        var state = dataMutator.GetLayoutEvaluatorState();
        Assert.NotNull(state);
        var fieldsToRemove = await LayoutEvaluator.GetHiddenFieldsForRemoval(state, evaluateRemoveWhenHidden: false);
        AssertEqualSets(
            [
                "location",
                "geometries[0].data",
                "geometries[0].label",
                "geometries[0].isEditable",
                "geometries[0].style",
                "geometries[1].data",
                "geometries[1].label",
                "geometries[1].isEditable",
                "geometries[1].style",
            ],
            fieldsToRemove.Select(d => d.Field)
        );

        // The rows are kept because the visible group references them, only the map's fields are cleared
        var cleanData = await dataMutator.GetCleanAccessor().GetFormData<SkjemaModel>();
        Assert.NotNull(cleanData);
        Assert.Null(cleanData.Location);
        Assert.NotNull(cleanData.Geometries);
        Assert.Equal(2, cleanData.Geometries.Count);
        Assert.Null(cleanData.Geometries[0].Data);
        Assert.Null(cleanData.Geometries[0].Label);
        Assert.Null(cleanData.Geometries[0].IsEditable);
        Assert.Equal("comment0", cleanData.Geometries[0].Comment);
        Assert.Null(cleanData.Geometries[1].Data);
        Assert.Equal("comment1", cleanData.Geometries[1].Comment);
    }

    [Fact]
    public async Task VisibleMap_RemovesNothing()
    {
        await using var provider = _collection.BuildServiceProvider();
        var dataMutator = await provider.CreateInstanceDataUnitOfWork(
            CreateModel(hideMap: false, hideGroup: false),
            _dataType,
            null
        );

        var state = dataMutator.GetLayoutEvaluatorState();
        Assert.NotNull(state);
        var fieldsToRemove = await LayoutEvaluator.GetHiddenFieldsForRemoval(state, evaluateRemoveWhenHidden: false);
        Assert.Empty(fieldsToRemove);
    }

    [Fact]
    public async Task HiddenMap_WithNullGeometries_RemovesTopLevelBindings()
    {
        await using var provider = _collection.BuildServiceProvider();
        var dataMutator = await provider.CreateInstanceDataUnitOfWork(
            new SkjemaModel
            {
                Location = "59.9,10.7",
                Geometries = null,
                HideMap = true,
                HideGroup = true,
            },
            _dataType,
            null
        );

        var state = dataMutator.GetLayoutEvaluatorState();
        Assert.NotNull(state);
        var fieldsToRemove = await LayoutEvaluator.GetHiddenFieldsForRemoval(state, evaluateRemoveWhenHidden: false);
        AssertEqualSets(["location", "geometries"], fieldsToRemove.Select(d => d.Field));

        var cleanData = await dataMutator.GetCleanAccessor().GetFormData<SkjemaModel>();
        Assert.NotNull(cleanData);
        Assert.Null(cleanData.Location);
        Assert.Null(cleanData.Geometries);
    }

    [Fact]
    public async Task HiddenMap_WithRemoveWhenHiddenFalse_KeepsMapData()
    {
        await using var provider = _collection.BuildServiceProvider();
        var model = CreateModel(hideMap: true, hideGroup: true);
        model.KeepMapData = true;
        var dataMutator = await provider.CreateInstanceDataUnitOfWork(model, _dataType, null);

        var state = dataMutator.GetLayoutEvaluatorState();
        Assert.NotNull(state);
        var fieldsToRemove = await LayoutEvaluator.GetHiddenFieldsForRemoval(state, evaluateRemoveWhenHidden: true);

        // Only the hidden group contributes, the map protects "location", "geometries" and the rows
        AssertEqualSets(["geometries[0].comment", "geometries[1].comment"], fieldsToRemove.Select(d => d.Field));
    }

    [Fact]
    public async Task HiddenMap_RemoveHiddenDataWithDeleteRow_RemovesGeometries()
    {
        // Same call as ProcessTaskFinalizer does when AppSettings.RemoveHiddenData is enabled
        await using var provider = _collection.BuildServiceProvider();
        var dataMutator = await provider.CreateInstanceDataUnitOfWork(
            CreateModel(hideMap: true, hideGroup: true),
            _dataType,
            null
        );

        var state = dataMutator.GetLayoutEvaluatorState();
        Assert.NotNull(state);
        await LayoutEvaluator.RemoveHiddenDataAsync(state, RowRemovalOption.DeleteRow, evaluateRemoveWhenHidden: true);

        var data = await dataMutator.GetFormData<SkjemaModel>();
        Assert.NotNull(data);
        Assert.Null(data.Location);
        Assert.Null(data.Geometries);
    }

    [Fact]
    public async Task VisibleMap_RemoveHiddenDataWithDeleteRow_KeepsLocationAndRows()
    {
        await using var provider = _collection.BuildServiceProvider();
        var dataMutator = await provider.CreateInstanceDataUnitOfWork(
            CreateModel(hideMap: false, hideGroup: true),
            _dataType,
            null
        );

        var state = dataMutator.GetLayoutEvaluatorState();
        Assert.NotNull(state);
        await LayoutEvaluator.RemoveHiddenDataAsync(state, RowRemovalOption.DeleteRow, evaluateRemoveWhenHidden: true);

        var data = await dataMutator.GetFormData<SkjemaModel>();
        Assert.NotNull(data);
        Assert.Equal("59.9,10.7", data.Location);
        // The visible map protects the rows the hidden repeating group would otherwise delete
        Assert.NotNull(data.Geometries);
        Assert.Equal(2, data.Geometries.Count);
        Assert.Equal("POINT (10.7 59.9)", data.Geometries[0].Data);
        Assert.Null(data.Geometries[0].Comment);
        Assert.Equal("label1", data.Geometries[1].Label);
        Assert.Null(data.Geometries[1].Comment);
    }

    [Theory]
    [InlineData("geometryData", "geometries.data")]
    [InlineData("geometryLabel", "geometries.label")]
    [InlineData("geometryIsEditable", "geometries.isEditable")]
    [InlineData("geometryIsHidden", "geometries.isHidden")]
    [InlineData("geometryStyle", "geometries.style")]
    public void Parse_GeometryBindingWithoutGeometries_Throws(string bindingName, string field)
    {
        var json = $$"""
            {
                "id": "map",
                "type": "Map",
                "dataModelBindings": {
                    "{{bindingName}}": "{{field}}"
                }
            }
            """;
        using var document = JsonDocument.Parse(json);

        var exception = Assert.Throws<JsonException>(() => MapComponent.Parse(document.RootElement, "page", "layout"));
        Assert.Contains("layout.page.map", exception.Message);
        Assert.Contains(bindingName, exception.Message);
        Assert.Contains("requires 'dataModelBindings.geometries'", exception.Message);
    }

    // TODO v9: These row bindings should be rejected during parsing. See MapGeometriesBinding.Parse
    [Theory]
    [InlineData("geometryData", "other.data")]
    [InlineData("geometryLabel", "geometriesOther.label")]
    [InlineData("geometryIsEditable", "geometries")]
    public void Parse_GeometryBindingOutsideGeometries_IsAccepted(string bindingName, string field)
    {
        var json = $$"""
            {
                "id": "map",
                "type": "Map",
                "dataModelBindings": {
                    "geometries": "geometries",
                    "{{bindingName}}": "{{field}}"
                }
            }
            """;
        using var document = JsonDocument.Parse(json);

        var component = MapComponent.Parse(document.RootElement, "page", "layout");

        Assert.Equal(new ModelBinding { Field = field }, component.DataModelBindings[bindingName]);
    }

    [Theory]
    // The data type might be the default data type of the layout set, which is unknown while parsing
    [InlineData("\"geometries\"", "model")]
    [InlineData("{ \"field\": \"geometries\", \"dataType\": \"model\" }", "otherModel")]
    public void Parse_GeometryBindingWithOtherDataType_IsAccepted(string geometriesBinding, string dataType)
    {
        var json = $$"""
            {
                "id": "map",
                "type": "Map",
                "dataModelBindings": {
                    "geometries": {{geometriesBinding}},
                    "geometryData": { "field": "geometries.data", "dataType": "{{dataType}}" }
                }
            }
            """;
        using var document = JsonDocument.Parse(json);

        var component = MapComponent.Parse(document.RootElement, "page", "layout");

        Assert.NotNull(component.GeometriesBinding);
        Assert.Equal(
            new ModelBinding { Field = "geometries.data", DataType = dataType },
            component.GeometriesBinding.Data
        );
    }

    [Fact]
    public async Task HiddenMap_WithRowBindingNamingTheDefaultDataType_RemovesGeometries()
    {
        var collection = new MockedServiceCollection { OutputHelper = _outputHelper };
        var dataType = collection.AddDataType<SkjemaModel>();
        collection.AddLayoutSet(
            dataType,
            $$"""
            {
                "data": {
                    "layout": [
                        {
                            "id": "map",
                            "type": "Map",
                            "dataModelBindings": {
                                "geometries": "geometries",
                                "geometryData": { "field": "geometries.data", "dataType": "{{dataType.Id}}" }
                            },
                            "hidden": ["dataModel", "hideMap"]
                        }
                    ]
                }
            }
            """
        );
        await using var provider = collection.BuildServiceProvider();
        var dataMutator = await provider.CreateInstanceDataUnitOfWork(
            CreateModel(hideMap: true, hideGroup: true),
            dataType,
            null
        );

        var state = dataMutator.GetLayoutEvaluatorState();
        Assert.NotNull(state);
        var fieldsToRemove = await LayoutEvaluator.GetHiddenFieldsForRemoval(state, evaluateRemoveWhenHidden: false);
        AssertEqualSets(
            [
                "geometries",
                "geometries[0]",
                "geometries[0].data",
                "geometries[0].label",
                "geometries[0].isEditable",
                "geometries[0].style",
                "geometries[1]",
                "geometries[1].data",
                "geometries[1].label",
                "geometries[1].isEditable",
                "geometries[1].style",
            ],
            fieldsToRemove.Select(d => d.Field)
        );
    }

    [Fact]
    public void Parse_UnknownBinding_Throws()
    {
        using var document = JsonDocument.Parse(
            """
            {
                "id": "map",
                "type": "Map",
                "dataModelBindings": {
                    "simpleBinding": "location",
                    "geometry": "geometries"
                }
            }
            """
        );

        var exception = Assert.Throws<JsonException>(() => MapComponent.Parse(document.RootElement, "page", "layout"));
        Assert.Contains("unknown 'dataModelBindings.geometry'", exception.Message);
    }

    [Fact]
    public void Parse_ValidBindings_Succeeds()
    {
        using var document = JsonDocument.Parse(
            """
            {
                "id": "map",
                "type": "Map",
                "dataModelBindings": {
                    "simpleBinding": "location",
                    "geometries": { "field": "geometries", "dataType": "model" },
                    "geometryData": { "field": "geometries.data", "dataType": "model" },
                    "geometryLabel": "geometries.details.label",
                    "geometryIsEditable": "geometries.isEditable",
                    "geometryIsHidden": "geometries.isHidden",
                    "geometryStyle": "geometries.style"
                }
            }
            """
        );

        var component = MapComponent.Parse(document.RootElement, "page", "layout");

        Assert.Equal("map", component.Id);
        Assert.Equal("Map", component.Type);
        Assert.Equal(7, component.DataModelBindings.Count);
        Assert.Equal(new ModelBinding { Field = "location" }, component.SimpleBinding);
        var geometries = component.GeometriesBinding;
        Assert.NotNull(geometries);
        Assert.Equal(new ModelBinding { Field = "geometries", DataType = "model" }, geometries.Geometries);
        Assert.Equal(new ModelBinding { Field = "geometries.data", DataType = "model" }, geometries.Data);
        Assert.Equal(new ModelBinding { Field = "geometries.details.label" }, geometries.Label);
        Assert.Equal(new ModelBinding { Field = "geometries.isEditable" }, geometries.IsEditable);
        Assert.Equal(new ModelBinding { Field = "geometries.isHidden" }, geometries.IsHidden);
        Assert.Equal(new ModelBinding { Field = "geometries.style" }, geometries.Style);
    }

    [Fact]
    public void Parse_GeometriesOnly_UsesDefaultRowBindings()
    {
        using var document = JsonDocument.Parse(
            """
            {
                "id": "map",
                "type": "Map",
                "dataModelBindings": {
                    "geometries": { "field": "areas", "dataType": "model" }
                }
            }
            """
        );

        var component = MapComponent.Parse(document.RootElement, "page", "layout");

        Assert.Null(component.SimpleBinding);
        var geometries = component.GeometriesBinding;
        Assert.NotNull(geometries);
        Assert.Equal(new ModelBinding { Field = "areas", DataType = "model" }, geometries.Geometries);
        Assert.Equal(new ModelBinding { Field = "areas.label", DataType = "model" }, geometries.Label);
        Assert.Equal(new ModelBinding { Field = "areas.data", DataType = "model" }, geometries.Data);
        Assert.Equal(new ModelBinding { Field = "areas.isEditable", DataType = "model" }, geometries.IsEditable);
        Assert.Equal(new ModelBinding { Field = "areas.isHidden", DataType = "model" }, geometries.IsHidden);
        Assert.Equal(new ModelBinding { Field = "areas.style", DataType = "model" }, geometries.Style);
    }

    [Fact]
    public void Parse_SimpleBindingOnly_Succeeds()
    {
        using var document = JsonDocument.Parse(
            """
            {
                "id": "map",
                "type": "Map",
                "dataModelBindings": {
                    "simpleBinding": "location"
                }
            }
            """
        );

        var component = MapComponent.Parse(document.RootElement, "page", "layout");

        Assert.Equal(new ModelBinding { Field = "location" }, component.SimpleBinding);
        Assert.Null(component.GeometriesBinding);
        Assert.Single(component.DataModelBindings);
    }

    private void AssertEqualSets(IEnumerable<string> expected, IEnumerable<string> actual)
    {
        var expectedList = expected.Order().ToList();
        var actualList = actual.Order().ToList();

        _outputHelper.WriteLine("Actual:");
        foreach (var item in actualList)
        {
            _outputHelper.WriteLine($"""  "{item}",""");
        }

        Assert.Equal(expectedList, actualList);
    }
}
