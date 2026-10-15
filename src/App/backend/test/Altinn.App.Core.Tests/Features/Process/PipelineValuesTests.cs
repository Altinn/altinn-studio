using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Tests.Features.Process;

public class PipelineValuesTests
{
    [Fact]
    public void Set_ThenGet_ReturnsTheValue_AndMarksTheValuesChanged()
    {
        var values = new PipelineValues();

        values.Set("shipmentId", "42");

        Assert.Equal("42", values.Get("shipmentId"));
        Assert.True(values.IsChanged);
    }

    [Fact]
    public void Get_OfAValueNeverSet_IsNull()
    {
        Assert.Null(new PipelineValues().Get("shipmentId"));
    }

    [Fact]
    public void Set_TheSameValueAgain_IsNotAChange()
    {
        var values = new PipelineValues(new Dictionary<string, string> { ["shipmentId"] = "42" });

        values.Set("shipmentId", "42");

        Assert.False(values.IsChanged);
    }

    [Fact]
    public void Remove_AValueThatIsThere_IsAChange_AndOneThatIsNotIsNot()
    {
        var values = new PipelineValues(new Dictionary<string, string> { ["shipmentId"] = "42" });

        values.Remove("other");
        Assert.False(values.IsChanged);

        values.Remove("shipmentId");
        Assert.True(values.IsChanged);
        Assert.Null(values.Get("shipmentId"));
    }

    [Fact]
    public void Snapshot_IsACopy()
    {
        var values = new PipelineValues();
        values.Set("a", "1");

        IReadOnlyDictionary<string, string> snapshot = values.Snapshot();
        values.Set("a", "2");

        Assert.Equal("1", snapshot["a"]);
    }

    [Fact]
    public void Set_PastTheLimits_Throws()
    {
        var values = new PipelineValues();

        Assert.Throws<ArgumentException>(() => values.Set(new string('n', PipelineValues.MaxNameLength + 1), "x"));
        Assert.Throws<ArgumentException>(() => values.Set("v", new string('v', PipelineValues.MaxValueLength + 1)));
        Assert.Throws<ArgumentException>(() => values.Set(" ", "x"));

        for (int i = 0; i < PipelineValues.MaxCount; i++)
        {
            values.Set($"name{i}", "x");
        }

        Assert.Throws<ArgumentException>(() => values.Set("oneTooMany", "x"));
        // Replacing a value already there is not adding one.
        values.Set("name0", "y");
        Assert.Equal("y", values.Get("name0"));
    }
}
