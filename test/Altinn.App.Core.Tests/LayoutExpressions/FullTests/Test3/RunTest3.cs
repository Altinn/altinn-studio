#nullable disable
using System.Text.Json.Serialization;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Expressions;
using FluentAssertions;

namespace Altinn.App.Core.Tests.LayoutExpressions.FullTests.Test3;

public class RunTest3
{
    [Fact]
    public async Task ValidateDataModel()
    {
        var state = await LayoutTestUtils.GetLayoutModelTools(new DataModel(), "Test3");
        var errors = state.GetModelErrors();
        errors.Should().BeEmpty();
    }

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
                        Binding3 = default
                    },
                    new()
                    {
                        Binding = "binding",
                        Binding2 = 2,
                        Binding3 = default
                    },
                    new()
                    {
                        Binding = "hideRow",
                        Binding2 = 3,
                        Binding3 = "text"
                    }
                }
            }
        };
        var state = await LayoutTestUtils.GetLayoutModelTools(data, "Test3");
        var hidden = LayoutEvaluator.GetHiddenFieldsForRemoval(state);

        // Should try to remove "some.data[0].binding2", because it is not nullable int and the parent object exists
        hidden.Should().BeEquivalentTo(new List<string> { "some.data[2]" });

        // Verify before removing data
        data.Some.Data.Should().HaveCount(3);
        data.Some.Data[0].Binding.Should().BeNull();
        data.Some.Data[0].Binding2.Should().Be(0); // binding is not nullable, but will be reset to zero
        data.Some.Data[1].Binding.Should().Be("binding");
        data.Some.Data[1].Binding2.Should().Be(2);
        data.Some.Data[2].Binding.Should().Be("hideRow");
        data.Some.Data[2].Binding2.Should().Be(3);
        data.Some.Data[2].Binding3.Should().Be("text");
        LayoutEvaluator.RemoveHiddenData(state, RowRemovalOption.SetToNull);

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
                        Binding3 = default
                    },
                    new()
                    {
                        Binding = "binding",
                        Binding2 = 2,
                        Binding3 = default
                    },
                    new()
                    {
                        Binding = "hideRow",
                        Binding2 = 3,
                        Binding3 = "text"
                    }
                }
            }
        };
        var state = await LayoutTestUtils.GetLayoutModelTools(data, "Test3");
        var hidden = LayoutEvaluator.GetHiddenFieldsForRemoval(state);

        // Should try to remove "some.data[0].binding2", because it is not nullable int and the parent object exists
        hidden.Should().BeEquivalentTo(new List<string> { "some.data[2]" });

        // Verify before removing data
        data.Some.Data.Should().HaveCount(3);
        data.Some.Data[0].Binding.Should().BeNull();
        data.Some.Data[0].Binding2.Should().Be(0); // binding is not nullable, but will be reset to zero
        data.Some.Data[1].Binding.Should().Be("binding");
        data.Some.Data[1].Binding2.Should().Be(2);
        data.Some.Data[2].Binding.Should().Be("hideRow");
        data.Some.Data[2].Binding2.Should().Be(3);
        data.Some.Data[2].Binding3.Should().Be("text");

        // Verify rows deleted
        LayoutEvaluator.RemoveHiddenData(state, RowRemovalOption.DeleteRow);
        data.Some.Data.Should().HaveCount(2);
        data.Some.Data[0].Binding.Should().BeNull();
        data.Some.Data[0].Binding2.Should().Be(0); // binding is not nullable, but will be reset to zero
        data.Some.Data[1].Binding.Should().Be("binding");
        data.Some.Data[1].Binding2.Should().Be(2);
    }
}

public class DataModel
{
    [JsonPropertyName("some")]
    public Some Some { get; set; }
}

public class Some
{
    [JsonPropertyName("notRepeating")]
    public string NotRepeating { get; set; }

    [JsonPropertyName("data")]
    public List<Data> Data { get; set; }
}

public class Data
{
    [JsonPropertyName("binding")]
    public string Binding { get; set; }

    [JsonPropertyName("binding2")]
    public int Binding2 { get; set; }

    [JsonPropertyName("binding3")]
    public string Binding3 { get; set; }
}
