using System.Reflection;

namespace Altinn.Codelists.Utilities;

/// <summary>
/// Helper class for embeded resources.
/// </summary>
internal static class EmbeddedResource
{
    /// <summary>
    /// Finds an embeded resource, by name, within the executing assembly and reads it as string.
    /// </summary>
    /// <param name="resourceName"></param>
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
    /// <exception cref="InvalidOperationException"></exception>
    public static Stream LoadDataAsStream(string resourceName)
    {
        var assembly = Assembly.GetExecutingAssembly();
        Stream? resourceStream = assembly.GetManifestResourceStream(resourceName);
        try
        {
            if (resourceStream == null)
            {
                throw new InvalidOperationException(
                    $"Unable to find resource {resourceName} embedded in assembly {assembly.FullName}."
                );
            }

            resourceStream.Seek(0, SeekOrigin.Begin);

            return resourceStream;
        }
        catch (Exception)
        {
            resourceStream?.Dispose();
            throw;
        }
    }
}
