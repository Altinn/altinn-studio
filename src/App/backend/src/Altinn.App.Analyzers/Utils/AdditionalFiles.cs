namespace Altinn.App.Analyzers.Utils;

/// <summary>Finds the app's own files among the analysis's additional files.</summary>
internal static class AdditionalFiles
{
    /// <summary>
    /// The one file that matches <paramref name="predicate"/>, or null when none or more than one does. A single app
    /// project has exactly one of each of its files; more than one means a project layout an analysis cannot reason
    /// about, so it stays quiet rather than guessing.
    /// </summary>
    internal static AdditionalText? Single(
        ImmutableArray<AdditionalText> additionalFiles,
        Func<AdditionalText, bool> predicate
    )
    {
        AdditionalText? found = null;
        foreach (var file in additionalFiles)
        {
            if (!predicate(file))
                continue;

            if (found is not null)
                return null;

            found = file;
        }

        return found;
    }
}
