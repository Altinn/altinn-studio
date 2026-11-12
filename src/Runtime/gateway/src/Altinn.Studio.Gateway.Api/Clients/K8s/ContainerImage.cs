namespace Altinn.Studio.Gateway.Api.Clients.K8s;

internal static class ContainerImage
{
    /// <summary>
    /// Gets the tag of an image reference such as <c>registry:5000/org/app:tag@sha256:digest</c>. The registry's
    /// port also follows a colon, so only a colon after the last slash starts the tag.
    /// </summary>
    /// <returns>The tag, or null when the reference has none.</returns>
    public static string? TagOf(string? image)
    {
        if (string.IsNullOrEmpty(image))
        {
            return null;
        }

        var digestStart = image.IndexOf('@', StringComparison.Ordinal);
        var name = digestStart < 0 ? image : image[..digestStart];
        var tagSeparator = name.LastIndexOf(':');
        if (tagSeparator < 0 || tagSeparator < name.LastIndexOf('/') || tagSeparator == name.Length - 1)
        {
            return null;
        }

        return name[(tagSeparator + 1)..];
    }
}
