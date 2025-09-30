using System.Net.Http.Headers;
using System.Reflection;

namespace Altinn.App.Core.Extensions;

internal static class MultipartContentExtensions
{
    /// <summary>
    /// Removes the first item with the specified name
    /// </summary>
    public static bool RemoveByName(this MultipartContent content, string name)
    {
        ArgumentNullException.ThrowIfNull(content);
        ArgumentException.ThrowIfNullOrWhiteSpace(name);

        // Access the private _nestedContent field
        var nestedContentField = typeof(MultipartContent).GetField(
            "_nestedContent",
            BindingFlags.NonPublic | BindingFlags.Instance
        );

        if (nestedContentField?.GetValue(content) is List<HttpContent> nestedContent)
        {
            for (int i = 0; i < nestedContent.Count; i++)
            {
                if (nestedContent[i].Headers.ContentDisposition?.Name?.Trim('"') == name)
                {
                    nestedContent.RemoveAt(i);
                    return true;
                }
            }
        }

        return false;
    }

    /// <summary>
    /// Replaces an existing item with the specified name, or adds it if it doesn't exist
    /// </summary>
    public static void ReplaceByName(this MultipartContent content, HttpContent newContent, string name)
    {
        ArgumentNullException.ThrowIfNull(content);
        ArgumentNullException.ThrowIfNull(newContent);
        ArgumentException.ThrowIfNullOrWhiteSpace(name);

        // Remove existing item if it exists
        content.RemoveByName(name);

        // Preserve existing ContentDisposition or create new one
        if (newContent.Headers.ContentDisposition == null)
        {
            newContent.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data");
        }

        // Set the name while preserving other properties
        newContent.Headers.ContentDisposition.Name = name;

        // Add the new content (use base Add method to avoid overwriting ContentDisposition)
        content.Add(newContent);
    }
}
