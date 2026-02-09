using System.Text.Json;

namespace StudioGateway.Api.Clients.K8s;

internal sealed class HelmRelease
{
    private readonly JsonElement _root;

    public HelmRelease(JsonElement root)
    {
        _root = root.Clone();
    }

    public string? GetName()
    {
        if (
            _root.TryGetProperty("metadata", out var metadata)
            && metadata.TryGetProperty("name", out var name)
            && name.ValueKind == JsonValueKind.String
            && name.GetString() is { Length: > 0 } helmReleaseName
        )
        {
            return helmReleaseName;
        }

        return null;
    }

    public string? GetImageTag()
    {
        if (
            _root.TryGetProperty("spec", out var spec)
            && spec.TryGetProperty("values", out var values)
            && values.TryGetProperty("image", out var image)
            && image.TryGetProperty("tag", out var tag)
            && tag.ValueKind == JsonValueKind.String
            && tag.GetString() is { Length: > 0 } imageTag
        )
        {
            return imageTag;
        }

        return null;
    }

    public IReadOnlyDictionary<string, string> GetLabels() => GetMetadataMap("labels");

    public IReadOnlyDictionary<string, string> GetAnnotations() => GetMetadataMap("annotations");

    private IReadOnlyDictionary<string, string> GetMetadataMap(string fieldName)
    {
        if (
            !_root.TryGetProperty("metadata", out var metadata)
            || !metadata.TryGetProperty(fieldName, out var values)
            || values.ValueKind != JsonValueKind.Object
        )
        {
            return new Dictionary<string, string>();
        }

        var result = new Dictionary<string, string>();
        foreach (var prop in values.EnumerateObject())
        {
            if (prop.Value.ValueKind == JsonValueKind.String && prop.Value.GetString() is { } value)
                result[prop.Name] = value;
        }

        return result;
    }
}
