using System.Text.Json;

namespace StudioGateway.Api.Clients.K8s;

internal sealed class HelmRelease
{
    private readonly JsonElement _root;

    public HelmRelease(JsonElement root)
    {
        _root = root;
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

    public IReadOnlyDictionary<string, string> GetLabels()
    {
        if (!_root.TryGetProperty("metadata", out var metadata) || !metadata.TryGetProperty("labels", out var labels))
        {
            return new Dictionary<string, string>();
        }

        var result = new Dictionary<string, string>();
        foreach (var prop in labels.EnumerateObject())
        {
            if (prop.Value.GetString() is { } value)
                result[prop.Name] = value;
        }

        return result;
    }
}
