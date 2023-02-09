using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.App.PlatformServices.Tests.Helpers;

/// <summary>
/// Helper class for embeded resources.
/// </summary>
public static class EmbeddedResource
{
    /// <summary>
    /// Finds an embeded resource, by name, within the executing assembly and reads it as string.
    /// </summary>
    /// <param name="resourceName">The fully qualified name to the resource ie. including namespace</param>
    /// <returns></returns>
    public async static Task<string> LoadDataAsString(string resourceName)
    {
        var resourceStream = LoadDataAsStream(resourceName);

        using var reader = new StreamReader(resourceStream);
        string text = await reader.ReadToEndAsync();

        return text;
    }

    /// <summary>
    /// Finds an embeded resource, by name, within the executing assembly and reads it as a <see cref="Stream"/>
    /// </summary>
    /// <param name="resourceName">The name of the resource including namespace.</param>
    /// <exception cref="InvalidOperationException">Thrown when a resource can't be found.</exception>
    public static Stream LoadDataAsStream(string resourceName)
    {
        var assembly = Assembly.GetExecutingAssembly();
        Stream? resourceStream = assembly.GetManifestResourceStream(resourceName);

        if (resourceStream == null)
        {
            throw new InvalidOperationException($"Unable to find resource {resourceName} embedded in assembly {assembly.FullName}.");
        }

        resourceStream.Seek(0, SeekOrigin.Begin);

        return resourceStream;
    }
}
