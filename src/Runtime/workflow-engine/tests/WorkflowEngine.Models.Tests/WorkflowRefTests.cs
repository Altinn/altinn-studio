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
    public void Deserialize_GuidString_IsId()
    {
        var guid = Guid.NewGuid();
        var r = JsonSerializer.Deserialize<WorkflowRef>($"\"{guid}\"", _options);
        Assert.True(r.IsId);
        Assert.False(r.IsRef);
        Assert.Equal(guid, r.Id);
    }

    [Fact]
    public void Deserialize_MixedArray_ReturnsCorrectTypes()
    {
        var guid1 = Guid.NewGuid();
        var guid2 = Guid.NewGuid();
        var json = $"""["step-a", "{guid1}", "step-b", "{guid2}"]""";
        var refs = JsonSerializer.Deserialize<List<WorkflowRef>>(json, _options)!;

        Assert.Equal(4, refs.Count);
        Assert.Equal("step-a", refs[0].Ref);
        Assert.Equal(guid1, refs[1].Id);
        Assert.Equal("step-b", refs[2].Ref);
        Assert.Equal(guid2, refs[3].Id);
    }

    [Fact]
    public void Serialize_RefValue_WritesString()
    {
        WorkflowRef r = "step-a";
        var json = JsonSerializer.Serialize(r, _options);
        Assert.Equal("\"step-a\"", json);
    }

    [Fact]
    public void Serialize_IdValue_WritesGuidString()
    {
        var guid = Guid.NewGuid();
        WorkflowRef r = guid;
        var json = JsonSerializer.Serialize(r, _options);
        Assert.Equal($"\"{guid}\"", json);
    }

    [Fact]
    public void Deserialize_InvalidToken_Throws()
    {
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<WorkflowRef>("true", _options));
    }

    [Fact]
    public void Deserialize_NumberToken_Throws()
    {
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<WorkflowRef>("1234", _options));
    }

    [Fact]
    public void ImplicitConversion_FromString_IsRef()
    {
        WorkflowRef r = "my-ref";
        Assert.True(r.IsRef);
        Assert.Equal("my-ref", r.Ref);
    }

    [Fact]
    public void ImplicitConversion_FromGuid_IsId()
    {
        var guid = Guid.NewGuid();
        WorkflowRef r = guid;
        Assert.True(r.IsId);
        Assert.Equal(guid, r.Id);
    }
}
