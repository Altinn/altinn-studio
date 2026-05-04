using System.Text.Json.Serialization;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models.Layout;
using FluentAssertions;

namespace Altinn.App.Core.Tests.LayoutExpressions.FullTests.Test3;

public class RunTest3
{
    // Functionality for validation data model references has been removed, but might be reintroduced in the future
    // [Fact]
    // public async Task ValidateDataModel()
    // {
    //     var state = await LayoutTestUtils.GetLayoutModelTools(new DataModel(), "Test3");
    //     var errors = state.GetModelErrors();
    //     errors.Should().BeEmpty();
    // }

    [Fact]
    public async Task RemoveRowDataFromGroup()
    {
        var data = new DataModel()
        {
            Some = new()
            {
                NotRepeating = "showGroup",
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
                    new()
                    {
                        Binding = "hideRow",
                        Binding2 = 3,
                        Binding3 = "text",
                    },
                },
            },
        };
        var state = await LayoutTestUtils.GetLayoutModelTools(data, "Test3");
        var hidden = await LayoutEvaluator.GetHiddenFieldsForRemoval(state);

        // Should try to remove "some.data[0].binding2", because it is not nullable int and the parent object exists
        hidden
            .Select(d => d.Field)
            .Should()
            .BeEquivalentTo(["some.data[2]", "some.data[2].binding", "some.data[2].binding2", "some.data[2].binding3"]);

        // Verify before removing data
        data.Some.Data.Should().HaveCount(3);
        data.Some.Data[0].Binding.Should().BeNull();
        data.Some.Data[0].Binding2.Should().Be(0); // binding is not nullable, but will be reset to zero
        data.Some.Data[1].Binding.Should().Be("binding");
        data.Some.Data[1].Binding2.Should().Be(2);
        data.Some.Data[2].Binding.Should().Be("hideRow");
        data.Some.Data[2].Binding2.Should().Be(3);
        data.Some.Data[2].Binding3.Should().Be("text");
        await LayoutEvaluator.RemoveHiddenDataAsync(state, RowRemovalOption.SetToNull);

        // Verify row not deleted but fields null
        data.Some.Data.Should().HaveCount(3);
        data.Some.Data[0].Binding.Should().BeNull();
        data.Some.Data[0].Binding2.Should().Be(0); // binding is not nullable, but will be reset to zero
        data.Some.Data[1].Binding.Should().Be("binding");
        data.Some.Data[1].Binding2.Should().Be(2);
        data.Some.Data[2].Should().BeNull();
    }

    [Fact]
    public async Task RemoveRowFromGroup()
    {
        var data = new DataModel()
        {
            Some = new()
            {
                NotRepeating = "showGroup",
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
                    new()
                    {
                        Binding = "hideRow",
                        Binding2 = 3,
                        Binding3 = "text",
                    },
                    new()
                    {
                        Binding = "binding",
                        Binding2 = 4,
                        Binding3 = default,
                    },
                    new()
                    {
                        Binding = "hideRow",
                        Binding2 = 5,
                        Binding3 = default,
                    },
                    new()
                    {
                        Binding = "binding",
                        Binding2 = 6,
                        Binding3 = default,
                    },
                },
            },
        };
        var state = await LayoutTestUtils.GetLayoutModelTools(data, "Test3");
        var hidden = await LayoutEvaluator.GetHiddenFieldsForRemoval(state);

        // Should try to remove "some.data[0].binding2", because it is not nullable int and the parent object exists
        hidden
            .Select(d => d.Field)
            .Should()
            .BeEquivalentTo([
                "some.data[2]",
                "some.data[2].binding",
                "some.data[2].binding2",
                "some.data[2].binding3",
                "some.data[4]",
                "some.data[4].binding",
                "some.data[4].binding2",
                "some.data[4].binding3",
            ]);

        // Verify before removing data
        data.Some.Data.Should().HaveCount(6);
        data.Some.Data[0].Binding.Should().BeNull();
        data.Some.Data[0].Binding2.Should().Be(0); // binding is not nullable, but will be reset to zero
        data.Some.Data[1].Binding.Should().Be("binding");
        data.Some.Data[1].Binding2.Should().Be(2);
        data.Some.Data[2].Binding.Should().Be("hideRow");
        data.Some.Data[2].Binding2.Should().Be(3);
        data.Some.Data[2].Binding3.Should().Be("text");
        data.Some.Data[3].Binding.Should().Be("binding");
        data.Some.Data[3].Binding2.Should().Be(4);
        data.Some.Data[3].Binding3.Should().Be(null);
        data.Some.Data[4].Binding.Should().Be("hideRow");
        data.Some.Data[4].Binding2.Should().Be(5);
        data.Some.Data[4].Binding3.Should().Be(null);
        data.Some.Data[5].Binding.Should().Be("binding");
        data.Some.Data[5].Binding2.Should().Be(6);
        data.Some.Data[5].Binding3.Should().Be(null);

        // Verify rows deleted
        await LayoutEvaluator.RemoveHiddenDataAsync(state, RowRemovalOption.DeleteRow);
        data.Some.Data.Should().HaveCount(4);
        data.Some.Data[0].Binding.Should().BeNull();
        data.Some.Data[0].Binding2.Should().Be(0); // binding is not nullable, but will be reset to zero
        data.Some.Data[1].Binding.Should().Be("binding");
        data.Some.Data[1].Binding2.Should().Be(2);
        data.Some.Data[2].Binding.Should().Be("binding");
        data.Some.Data[2].Binding2.Should().Be(4);
        data.Some.Data[3].Binding.Should().Be("binding");
        data.Some.Data[3].Binding2.Should().Be(6);
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
