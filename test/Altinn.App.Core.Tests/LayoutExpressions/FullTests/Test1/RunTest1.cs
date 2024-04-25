#nullable disable
using System.Text.Json.Serialization;
using Altinn.App.Core.Internal.Expressions;
using FluentAssertions;
using Xunit;

namespace Altinn.App.Core.Tests.LayoutExpressions.FullTests.Test1;

public class RunTest1
{
    [Fact]
    public async Task ValidateDataModel()
    {
        var state = await LayoutTestUtils.GetLayoutModelTools(new DataModel(), "Test1");
        var errors = state.GetModelErrors();
        errors.Should().BeEmpty();
    }

    [Fact]
    public async Task DoNotRemoveAnyData_WhenPageExpressionIsFalse()
    {
        var state = await LayoutTestUtils.GetLayoutModelTools(
            new DataModel
            {
                Some = new()
                {
                    Data = new() { Binding = "don't hide second page", Binding2 = 1235 }
                }
            },
            "Test1"
        );
        var hidden = LayoutEvaluator.GetHiddenFieldsForRemoval(state);
        hidden.Should().BeEmpty();
    }

    [Fact]
    public async Task RemoveData_WhenPageExpressionIsTrue()
    {
        var state = await LayoutTestUtils.GetLayoutModelTools(
            new DataModel
            {
                Some = new()
                {
                    Data = new() { Binding = "hideSecondPage", Binding2 = 1235 }
                }
            },
            "Test1"
        );
        var hidden = LayoutEvaluator.GetHiddenFieldsForRemoval(state);
        hidden.Should().BeEquivalentTo(new string[] { "some.data.binding2" });
    }

    [Fact]
    public async Task RunLayoutValidationsForRequired_InvalidComponentHidden_ReturnsNoIssus()
    {
        var state = await LayoutTestUtils.GetLayoutModelTools(
            new DataModel
            {
                Some = new()
                {
                    Data = new() { Binding = "hideSecondPage", Binding2 = 1235 }
                }
            },
            "Test1"
        );
        var validationIssues = LayoutEvaluator.RunLayoutValidationsForRequired(state, dataElementId: "dummy");
        validationIssues.Should().BeEmpty();
    }

    [Fact]
    public async Task RunLayoutValidationsForRequired_InvalidComponentHidden_ReturnsSingleIssue()
    {
        var state = await LayoutTestUtils.GetLayoutModelTools(
            new DataModel
            {
                Some = new()
                {
                    Data = new() { Binding = "don't hide second page", Binding2 = 1235 }
                }
            },
            "Test1"
        );
        var validationIssues = LayoutEvaluator.RunLayoutValidationsForRequired(state, dataElementId: "dummy");
        validationIssues
            .Should()
            .BeEquivalentTo(new object[] { new { Code = "required", Field = "some.data.binding3" } });
    }
}

public class DataModel
{
    [JsonPropertyName("some")]
    public Some Some { get; set; }
}

public class Some
{
    [JsonPropertyName("data")]
    public Data Data { get; set; }
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
