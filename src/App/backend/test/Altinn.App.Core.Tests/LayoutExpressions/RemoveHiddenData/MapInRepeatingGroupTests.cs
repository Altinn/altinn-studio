using System.Text.Json.Serialization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Tests.Common.Fixtures;
using Altinn.Platform.Storage.Interface.Models;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.LayoutExpressions.RemoveHiddenData;

public class MapInRepeatingGroupTests
{
    private readonly MockedServiceCollection _collection;
    private readonly DataType _dataType;
    private readonly ITestOutputHelper _outputHelper;

    public class SkjemaModel
    {
        [JsonPropertyName("areas")]
        public List<Area>? Areas { get; set; }
    }

    public class Area
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("hideMap")]
        public bool HideMap { get; set; }

        [JsonPropertyName("geometries")]
        public List<GeometryRow>? Geometries { get; set; }
    }

    public class GeometryRow
    {
        [JsonPropertyName("data")]
        public string? Data { get; set; }

        [JsonPropertyName("label")]
        public string? Label { get; set; }
    }

    public MapInRepeatingGroupTests(ITestOutputHelper outputHelper)
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
                            "id": "areas",
                            "type": "RepeatingGroup",
                            "dataModelBindings": {
                                "group": "areas"
                            },
                            "maxCount": 5,
                            "children": ["name", "map"]
                        },
                        {
                            "id": "name",
                            "type": "Input",
                            "dataModelBindings": {
                                "simpleBinding": "areas.name"
                            }
                        },
                        {
                            "id": "map",
                            "type": "Map",
                            "dataModelBindings": {
                                "geometries": "areas.geometries",
                                "geometryData": "areas.geometries.data",
                                "geometryLabel": "areas.geometries.label"
                            },
                            "hidden": ["dataModel", "areas.hideMap"]
                        }
                    ]
                }
            }
            """
        );
    }

    [Fact]
    public async Task HiddenMapInRow_RemovesOnlyGeometriesForThatRow()
    {
        await using var provider = _collection.BuildServiceProvider();
        var dataMutator = await provider.CreateInstanceDataUnitOfWork(
            new SkjemaModel
            {
                Areas =
                [
                    new Area
                    {
                        Name = "hidden",
                        HideMap = true,
                        Geometries = [new GeometryRow { Data = "data0", Label = "label0" }],
                    },
                    new Area
                    {
                        Name = "visible",
                        HideMap = false,
                        Geometries =
                        [
                            new GeometryRow { Data = "data1", Label = "label1" },
                            new GeometryRow { Data = "data2", Label = "label2" },
                        ],
                    },
                ],
            },
            _dataType,
            null
        );

        var state = dataMutator.GetLayoutEvaluatorState();
        Assert.NotNull(state);
        var fieldsToRemove = await LayoutEvaluator.GetHiddenFieldsForRemoval(state, evaluateRemoveWhenHidden: false);

        var actual = fieldsToRemove.Select(d => d.Field).Order().ToList();
        foreach (var field in actual)
        {
            _outputHelper.WriteLine($"""  "{field}",""");
        }
        Assert.Equal(
            [
                "areas[0].geometries",
                "areas[0].geometries[0]",
                "areas[0].geometries[0].data",
                "areas[0].geometries[0].label",
            ],
            actual
        );

        var cleanData = await dataMutator.GetCleanAccessor().GetFormData<SkjemaModel>();
        Assert.NotNull(cleanData);
        Assert.NotNull(cleanData.Areas);
        Assert.Equal(2, cleanData.Areas.Count);
        Assert.Equal("hidden", cleanData.Areas[0].Name);
        Assert.Null(cleanData.Areas[0].Geometries);
        Assert.Equal("visible", cleanData.Areas[1].Name);
        var visibleGeometries = cleanData.Areas[1].Geometries;
        Assert.NotNull(visibleGeometries);
        Assert.Equal(2, visibleGeometries.Count);
        Assert.Equal("data1", visibleGeometries[0].Data);
        Assert.Equal("label2", visibleGeometries[1].Label);
    }
}
