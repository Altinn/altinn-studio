using System.Text.RegularExpressions;

namespace Altinn.Studio.Cli.Upgrade.Frontend.Fev3Tov4.IndexFileRewriter;

internal sealed class IndexFileUpgrader
{
    private readonly IList<string> _warnings = new List<string>();
    private readonly string _indexFile;
    private readonly string _version;
    private string? _indexHtml = null;

    public IndexFileUpgrader(string indexFile, string version)
    {
        _indexFile = indexFile;
        _version = version;
    }

    public IList<string> GetWarnings()
    {
        return _warnings;
    }

    public void Upgrade()
    {
        try
        {
            var lines = File.ReadLines(_indexFile);
            var newLines = new List<string>();

            foreach (var line in lines)
            {
                // Deleting fortawesome and fonts
                if (
                    Regex.IsMatch(line, @".*<!-- Third Party CSS -->.*")
                    || Regex.IsMatch(line, @".*<!-- Fonts -->.*")
                    || Regex.IsMatch(line, @".*https://altinncdn\.no/toolkits/fortawesome.*")
                    || Regex.IsMatch(line, @".*https://altinncdn\.no/fonts.*")
                )
                {
                    continue;
                }

                // Replace css bundle
                if (Regex.IsMatch(line, @".*altinn-app-frontend\.css.*"))
                {
                    // This preserves indentation
                    newLines.Add(
                        Regex.Replace(
                            line,
                            @"<link.*",
                            $@"<link rel=""stylesheet"" type=""text/css"" href=""https://altinncdn.no/toolkits/altinn-app-frontend/{_version}/altinn-app-frontend.css"">"
                        )
                    );
                    continue;
                }

                // Replace js bundle
                if (Regex.IsMatch(line, @".*altinn-app-frontend\.js.*"))
                {
                    // This preserves indentation
                    newLines.Add(
                        Regex.Replace(
                            line,
                            @"<script.*",
                            $@"<script src=""https://altinncdn.no/toolkits/altinn-app-frontend/{_version}/altinn-app-frontend.js""></script>"
                        )
                    );
                    continue;
                }

                newLines.Add(line);
            }

            // Remove excessive newlines
            _indexHtml = Regex.Replace(string.Join("\n", newLines), @"(\s*\n){3,}", "\n\n");
        }
        catch (Exception e)
        {
            _warnings.Add($"Failed to rewrite Index.cshtml: {e.Message}");
        }
    }

    public async Task Write()
    {
        if (_indexHtml is null)
        {
            return;
        }
        await File.WriteAllTextAsync(_indexFile, _indexHtml);
    }
}
