using System.Text.Json;

namespace WorkflowEngine.Models.Tests;

public class WorkflowRefTests
{
    private static readonly JsonSerializerOptions _options = new();

    [Fact]
    public void Deserialize_StringValue_IsRef()
    {
        var r = JsonSerializer.Deserialize<WorkflowRef>("\"step-a\"", _options);
        Assert.True(r.IsRef);
        Assert.False(r.IsId);
        Assert.Equal("step-a", r.Ref);
    }

    [Fact]
    public void Deserialize_NumberValue_IsId()
    {
        var r = JsonSerializer.Deserialize<WorkflowRef>("1234", _options);
        Assert.True(r.IsId);
        Assert.False(r.IsRef);
        Assert.Equal(1234L, r.Id);
    }

    [Fact]
    public void Deserialize_MixedArray_ReturnsCorrectTypes()
    {
        var json = """["step-a", 1234, "step-b", 9999]""";
        var refs = JsonSerializer.Deserialize<List<WorkflowRef>>(json, _options)!;

        Assert.Equal(4, refs.Count);
        Assert.Equal("step-a", refs[0].Ref);
        Assert.Equal(1234L, refs[1].Id);
        Assert.Equal("step-b", refs[2].Ref);
        Assert.Equal(9999L, refs[3].Id);
    }

    [Fact]
    public void Serialize_RefValue_WritesString()
    {
        WorkflowRef r = "step-a";
        var json = JsonSerializer.Serialize(r, _options);
        Assert.Equal("\"step-a\"", json);
    }

    [Fact]
    public void Serialize_IdValue_WritesNumber()
    {
        WorkflowRef r = 42L;
        var json = JsonSerializer.Serialize(r, _options);
        Assert.Equal("42", json);
    }

    [Fact]
    public void Deserialize_InvalidToken_Throws()
    {
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<WorkflowRef>("true", _options));
    }

    [Fact]
    public void ImplicitConversion_FromString_IsRef()
    {
        WorkflowRef r = "my-ref";
        Assert.True(r.IsRef);
        Assert.Equal("my-ref", r.Ref);
    }

    [Fact]
    public void ImplicitConversion_FromLong_IsId()
    {
        WorkflowRef r = 99L;
        Assert.True(r.IsId);
        Assert.Equal(99L, r.Id);
    }
}
