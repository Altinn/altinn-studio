using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Tests.Common.Fixtures;
using Altinn.Platform.Storage.Interface.Models;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.LayoutExpressions.RemoveHiddenData;

public class OptionsWithGroupTests
{
    private static readonly JsonSerializerOptions _jsonSerializerOptionsIndented = new JsonSerializerOptions
    {
        WriteIndented = true,
    };
    private readonly MockedServiceCollection _collection;
    private readonly DataType _dataType;
    private readonly ITestOutputHelper _outputHelper;

    public class SkjemaModel
    {
        [JsonPropertyName("group")]
        public List<SkjemaModelRow>? Group { get; set; }

        [JsonPropertyName("hideSelect")]
        public bool HideSelect { get; set; }

        [JsonPropertyName("hideGroup")]
        public bool HideGroup { get; set; }
    }

    public class SkjemaModelRow
    {
        [JsonPropertyName("checked")]
        public bool Checked { get; set; }

        [JsonPropertyName("label")]
        public string? Label { get; set; }

        [JsonPropertyName("value")]
        public string? Value { get; set; }

        [JsonPropertyName("rowName")]
        public string? RowName { get; set; }

        [JsonPropertyName("unmapped")]
        public string? Unmapped { get; set; }

        [JsonPropertyName("hideRowName")]
        public bool HideRowName { get; set; }

        [JsonPropertyName("hideRow")]
        public bool HideRow { get; set; }
    }

    public OptionsWithGroupTests(ITestOutputHelper outputHelper)
    {
        _outputHelper = outputHelper;
        _collection = new MockedServiceCollection();
        _collection.OutputHelper = outputHelper;
        _dataType = _collection.AddDataType<SkjemaModel>();

        _collection.AddLayoutSet(
            _dataType,
            """
            {
                "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/layout/layout.schema.v1.json",
                "data": {
                    "layout": [
                        {
                            "id": "MultipleSelect-LX05gH",
                            "type": "MultipleSelect",
                            "textResourceBindings": {
                                "title": "title"
                            },
                            "dataModelBindings": {
                                "group": "group",
                                "checked": "group.checked",
                                "simpleBinding": "group.value",
                                "label": "group.label"
                            },
                            "optionsId": "kommuneliste",
                            "required": true,
                            "alertOnChange": true,
                            "deletionStrategy":"hard",
                            "hidden": ["dataModel", "hideSelect"]
                        },
                        {
                            "id": "group",
                            "type": "RepeatingGroup",
                            "dataModelBindings": {
                                "group": "group"
                            },
                            "maxCount": 5,
                            "children": ["rowName"],
                            "hidden": ["dataModel", "hideGroup"],
                            "hiddenRow": ["dataModel", "group.hideRow"]
                        },
                        {
                            "id": "rowName",
                            "type": "Input",
                            "dataModelBindings": {
                                "simpleBinding": "group.rowName"
                            },
                            "hidden": ["dataModel", "group.hideRowName"]
                        }
                    ]
                }
            }
            """
        );
    }

    [Fact]
    public async Task TestRemoveGroup()
    {
        await using var provider = _collection.BuildServiceProvider();
        var dataMutator = await provider.CreateInstanceDataUnitOfWork(
            new SkjemaModel()
            {
                Group = [new SkjemaModelRow { Checked = true }, new SkjemaModelRow { Checked = false }],
                HideSelect = true,
                HideGroup = true,
            },
            _dataType,
            null
        );

        var state = dataMutator.GetLayoutEvaluatorState();
        Assert.NotNull(state);
        var fieldsToRemove = await LayoutEvaluator.GetHiddenFieldsForRemoval(state, evaluateRemoveWhenHidden: false);
        MyAssertEqualSets(
            [
                "group",
                "group[0]",
                "group[0].checked",
                "group[0].label",
                "group[0].rowName",
                "group[0].value",
                "group[1]",
                "group[1].checked",
                "group[1].label",
                "group[1].rowName",
                "group[1].value",
            ],
            fieldsToRemove.Select(d => d.Field)
        );

        var currentData = await dataMutator.GetFormData<SkjemaModel>();
        Assert.NotNull(currentData);
        Assert.NotNull(currentData.Group);
        Assert.NotEmpty(currentData.Group);
        var cleanData = await dataMutator.GetCleanAccessor().GetFormData<SkjemaModel>();
        Assert.NotNull(cleanData);
        Assert.Null(cleanData.Group);
    }

    [Fact]
    public async Task TestRemoveUnchecked()
    {
        await using var provider = _collection.BuildServiceProvider();
        var dataMutator = await provider.CreateInstanceDataUnitOfWork(
            new SkjemaModel()
            {
                Group =
                [
                    new SkjemaModelRow
                    {
                        Checked = true,
                        Label = "label1",
                        Value = "value1",
                        Unmapped = "unmapped1",
                    },
                    new SkjemaModelRow
                    {
                        Checked = false,
                        Label = "label2",
                        Value = "value2",
                        Unmapped = "unmapped2",
                    },
                ],
                HideSelect = false,
                HideGroup = true,
            },
            _dataType,
            null
        );

        var state = dataMutator.GetLayoutEvaluatorState();
        Assert.NotNull(state);
        var fieldsToRemove = await LayoutEvaluator.GetHiddenFieldsForRemoval(state, evaluateRemoveWhenHidden: false);

        MyAssertEqualSets(
            [
                "group[0].rowName",
                "group[1]",
                "group[1].checked",
                "group[1].value",
                "group[1].rowName",
                "group[1].label",
            ],
            fieldsToRemove.Select(d => d.Field)
        );

        var currentData = await dataMutator.GetFormData<SkjemaModel>();
        Assert.NotNull(currentData);
        Assert.NotNull(currentData.Group);
        Assert.NotEmpty(currentData.Group);
        var cleanData = await dataMutator.GetCleanAccessor().GetFormData<SkjemaModel>();
        Assert.NotNull(cleanData);
        Assert.NotNull(cleanData.Group);
        Assert.NotNull(cleanData.Group[0]);
        Assert.NotSame(currentData.Group[0], cleanData.Group[0]);
        Assert.Equal("label1", cleanData.Group[0].Label);
        Assert.Equal("value1", cleanData.Group[0].Value);
        Assert.Equal("unmapped1", cleanData.Group[0].Unmapped);
        Assert.Null(cleanData.Group[1]);
    }

    [Fact]
    public async Task TestCheckedPreservesRow()
    {
        await using var provider = _collection.BuildServiceProvider();
        var skjemaModel = new SkjemaModel()
        {
            Group = Enumerable
                .Range(0, 8)
                .Select(i => new SkjemaModelRow
                {
                    Checked = (i & 0b001) != 0,
                    HideRow = (i & 0b010) != 0,
                    HideRowName = (i & 0b100) != 0,
                    Label = $"label{i}",
                    Value = $"value{i}",
                    Unmapped = $"unmapped{i}",
                    RowName = $"rowName{i}",
                })
                .ToList(),
            HideSelect = false,
            HideGroup = false,
        };
        _outputHelper.WriteLine(JsonSerializer.Serialize(skjemaModel, _jsonSerializerOptionsIndented));
        var dataMutator = await provider.CreateInstanceDataUnitOfWork(skjemaModel, _dataType, null);

        var state = dataMutator.GetLayoutEvaluatorState();
        Assert.NotNull(state);
        var fieldsToRemove = await LayoutEvaluator.GetHiddenFieldsForRemoval(state, evaluateRemoveWhenHidden: false);

        var fieldsToRemoveSet = fieldsToRemove.Select(d => d.Field);

        MyAssertEqualSets(
            [
                "group[0].checked",
                "group[0].label",
                "group[0].value",
                "group[2]",
                "group[2].checked",
                "group[2].label",
                "group[2].value",
                "group[2].rowName",
                "group[3].rowName",
                "group[4].checked",
                "group[4].label",
                "group[4].rowName",
                "group[4].value",
                "group[5].rowName",
                "group[6]",
                "group[6].checked",
                "group[6].label",
                "group[6].rowName",
                "group[6].value",
                "group[7].rowName",
            ],
            fieldsToRemoveSet
        );
    }

    private void MyAssertEqualSets<T>(IEnumerable<T> expected, IEnumerable<T> actual)
    {
        var expectedSet = new HashSet<T>(expected);
        var actualSet = new HashSet<T>(actual);

        _outputHelper.WriteLine("Actual vs Expected set comparison:");
        _outputHelper.WriteLine("----------------------------------");
        _outputHelper.WriteLine("Actual Set:");
        foreach (var item in actualSet.Order())
        {
            _outputHelper.WriteLine($"""  "{item}",""");
        }

        var expectedNotInActual = expectedSet.Except(actualSet).Order().ToList();
        var actualNotInExpected = actualSet.Except(expectedSet).Order().ToList();

        if (expectedNotInActual.Count != 0)
        {
            _outputHelper.WriteLine($" {expectedNotInActual.Count} Items expected but not found in actual:");
            foreach (var item in expectedNotInActual)
            {
                _outputHelper.WriteLine($"""  "{item}",""");
            }
        }

        if (actualNotInExpected.Count != 0)
        {
            _outputHelper.WriteLine($" {actualNotInExpected.Count} Items found in actual but not expected:");
            foreach (var item in actualNotInExpected)
            {
                _outputHelper.WriteLine($"""  "{item}",""");
            }
        }
        Assert.Equal(expectedSet, actualSet);
    }
}
