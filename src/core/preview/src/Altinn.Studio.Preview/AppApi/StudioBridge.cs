namespace Altinn.Studio.Preview.AppApi;

/// <summary>
/// The script that <see cref="IndexPage"/> adds before the app frontend, which tells Studio which components the
/// frontend found errors in. <c>studio-bridge.js</c> says how, and the README which messages it sends.
/// </summary>
internal static class StudioBridge
{
    private const string ResourceName = "studio-bridge.js";

    /// <summary>The script, for a <c>script</c> element of its own.</summary>
    public static string Script { get; } = Read();

    private static string Read()
    {
        using Stream stream =
            typeof(StudioBridge).Assembly.GetManifestResourceStream(ResourceName)
            ?? throw new InvalidOperationException($"The assembly has no resource {ResourceName}.");
        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }
}
