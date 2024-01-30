using System.Text.RegularExpressions;

namespace altinn_app_cli.fev3tov4.IndexFileRewriter;

class IndexFileUpgrader
{
    private readonly IList<string> warnings = new List<string>();
    private readonly string indexFile;
    private readonly string version;
    private string? indexHtml = null;

    public IndexFileUpgrader(string indexFile, string version)
    {
        this.indexFile = indexFile;
        this.version = version;
    }

    public IList<string> GetWarnings()
    {
        return warnings;
    }

    public void Upgrade()
    {
        try
        {
            var lines = File.ReadLines(indexFile);
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
                            $@"<link rel=""stylesheet"" type=""text/css"" href=""https://altinncdn.no/toolkits/altinn-app-frontend/{this.version}/altinn-app-frontend.css"">"
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
                            $@"<script src=""https://altinncdn.no/toolkits/altinn-app-frontend/{this.version}/altinn-app-frontend.js""></script>"
                        )
                    );
                    continue;
                }

                newLines.Add(line);
            }

            // Remove excessive newlines
            this.indexHtml = Regex.Replace(string.Join("\n", newLines), @"(\s*\n){3,}", "\n\n");
        }
        catch (Exception e)
        {
            warnings.Add($"Failed to rewrite Index.cshtml: {e.Message}");
        }
    }

    public async Task Write()
    {
        if (this.indexHtml == null)
        {
            return;
        }
        await File.WriteAllTextAsync(this.indexFile, indexHtml);
    }
}
