using System.Text.Json.Serialization;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Layout;
using FluentAssertions;

namespace Altinn.App.Core.Tests.LayoutExpressions.FullTests.Test2;

public class RunTest2
{
    // Functionality for validation data model references has been removed, but might be reintroduced in the future
    // [Fact]
    // public async Task ValidateDataModel()
    // {
    //     var state = await LayoutTestUtils.GetLayoutModelTools(new DataModel(), "Test2");
    //     var errors = state.GetModelErrors();
    //     errors.Should().BeEmpty();
    // }

    [Fact]
    public async Task RemoveWholeGroup()
    {
        var data = new DataModel()
        {
            Some = new()
            {
                NotRepeating = "hideGroup",
                Data = new()
                {
                    new()
                    {
                        Binding = default,
                        Binding2 = default,
                        Binding3 = default,
                    },
                    new()
                    {
                        Binding = "binding",
                        Binding2 = 2,
                        Binding3 = default,
                    },
                },
            },
        };
        var state = await LayoutTestUtils.GetLayoutModelTools(data, "Test2");

        var hidden = await LayoutEvaluator.GetHiddenFieldsForRemoval(state);
        hidden
            .Should()
            .BeEquivalentTo(
                [new DataReference() { Field = "some.data", DataElementIdentifier = state.GetDefaultDataElementId() }]
            );

        // Verify before removing data
        data.Some.Data[0].Binding.Should().BeNull();
        data.Some.Data[0].Binding2.Should().Be(0); // binding is not nullable, but will be reset to zero
        data.Some.Data[1].Binding.Should().Be("binding");
        data.Some.Data[1].Binding2.Should().Be(2);
        await LayoutEvaluator.RemoveHiddenDataAsync(state, RowRemovalOption.DeleteRow);

        // Verify data was removed
        data.Some.Data.Should().BeNull();
    }

    [Fact]
    public async Task RemoveSingleRow()
    {
        var state = await LayoutTestUtils.GetLayoutModelTools(
            new DataModel()
            {
                Some = new()
                {
                    NotRepeating = "showGroup",
                    Data = new()
                    {
                        new() { Binding = "binding" },
                        new() { Binding2 = 2, Binding3 = "hidden" },
                    },
                },
            },
            "Test2"
        );
        var hidden = await LayoutEvaluator.GetHiddenFieldsForRemoval(state);

        hidden
            .Should()
            .BeEquivalentTo(
                [
                    new DataReference()
                    {
                        Field = "some.data[1].binding2",
                        DataElementIdentifier = state.GetDefaultDataElementId(),
                    },
                ]
            );
    }
}

public class DataModel
{
    [JsonPropertyName("some")]
    public Some? Some { get; set; }
}

public class Some
{
    [JsonPropertyName("notRepeating")]
    public string? NotRepeating { get; set; }

    [JsonPropertyName("data")]
    public List<Data>? Data { get; set; }
}

public class Data
{
    [JsonPropertyName("binding")]
    public string? Binding { get; set; }

    [JsonPropertyName("binding2")]
    public int Binding2 { get; set; }

    [JsonPropertyName("binding3")]
    public string? Binding3 { get; set; }
}
