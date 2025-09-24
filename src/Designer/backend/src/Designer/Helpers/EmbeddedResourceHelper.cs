using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;

namespace Altinn.Studio.Designer.Helpers;

/// <summary>
/// Helper class for loading embedded resources.
/// </summary>
public class EmbeddedResourceHelper
{
    private static readonly Assembly s_projectAssembly = typeof(EmbeddedResourceHelper).Assembly;

    /// <summary>
    /// Loads an embedded resource from the assembly as a string.
    /// Methods supports resource names with folder structure using '/' as separator.
    /// Example: "Resources/Templates/Default/README.md"
    /// Supports also resource with default embedded resource naming using '.' as separator.
    /// Example: "Resources.Templates.Default.README.md"
    /// </summary>
    /// <param name="resourceName">Name of the resource.</param>
    /// <returns>The content of the embedded resource as a string.</returns>
    public static string ReadEmbeddedResourceAsString(string resourceName)
    {
        var resourceStream = LoadEmbeddedResource(resourceName);
        using var reader = new StreamReader(resourceStream);
        return reader.ReadToEnd();
    }

    /// <summary>
    /// Loads an embedded resource from the assembly.
    /// Methods supports resource names with folder structure using '/' as separator.
    /// Example: "Resources/Templates/Default/README.md"
    /// Supports also resource with default embedded resource naming using '.' as separator.
    /// Example: "Resources.Templates.Default.README.md"
    /// </summary>
    /// <param name="resourceName">Name of the resource.</param>
    /// <returns>A <see cref="Stream"/> of the embedded resource.</returns>
    public static Stream LoadEmbeddedResource(string resourceName)
    {
        string resourceNameEnding = resourceName.Replace('/', '.');
        string embeddedResourceName = s_projectAssembly.GetManifestResourceNames()
            .Single(x => x.EndsWith(resourceNameEnding));
        return s_projectAssembly.GetManifestResourceStream(embeddedResourceName);
    }

    /// <summary>
    /// Lists all embedded resources in a given folder.
    /// Methods supports folder structure using '/' as separator.
    /// Example: "Resources/Templates/Default"
    /// Supports also folder structure using '.' as separator.
    /// Example: "Resources.Templates.Default"
    /// </summary>
    /// <param name="resourceFolder">The folder to list embedded resources from.</param>
    /// <returns>A list of embedded resource names.</returns>
    public static IEnumerable<string> ListEmbeddedResources(string resourceFolder)
    {
        string resourceNameEnding = resourceFolder.Replace('/', '.');
        return s_projectAssembly.GetManifestResourceNames()
            .Where(x => x.Contains(resourceNameEnding));
    }

    /// <summary>
    /// Retrieves the file name from a full embedded resource name.
    /// Example: "Altinn.Studio.Designer.Resources.Templates.Default.README.md"
    /// returns "README.md"
    /// </summary>
    /// <param name="resourceName">Embedded resource name.</param>
    /// <returns>The file name.</returns>
    public static string GetFileNameFromResourceName(string resourceName)
    {
        if (string.IsNullOrEmpty(resourceName))
            return resourceName;

        string[] parts = resourceName.Split('.');

        if (parts.Length >= 2)
            return string.Join(".", parts.Skip(parts.Length - 2));

        return resourceName;
    }

}
