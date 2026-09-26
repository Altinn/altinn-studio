namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Reports app files and folders whose names differ only in case from the names v9 reads. v9 matches every name
/// case-sensitively on every operating system, the way the Linux container always did, so an app that only ran on a
/// Windows or macOS developer machine because <c>ui/settings.json</c> passed for <c>ui/Settings.json</c> stops
/// starting there too. Each finding says what to rename the entry to.
/// </summary>
/// <remarks>
/// The check lists each folder and compares ordinally, so it finds the mismatches on a case-insensitive file
/// system, where asking for the expected path would succeed. The layout it knows is the one <c>AppFilesLoader</c>
/// in the app libraries reads.
/// </remarks>
internal sealed class AppFileNameCaseDetector
{
    private const string JsonExtension = ".json";
    private const string TextResourcePrefix = "resource.";

    private static readonly string[] _modelSuffixes =
    [
        ".schema.json",
        ".prefill.json",
        ".validation.json",
        ".calculation.json",
        ".xsd",
    ];

    private const string Summary =
        "These app files and folders differ only in case from the names v9 reads, and v9 matches names "
        + "case-sensitively on every operating system, as the Linux container always did. Rename them, with git mv "
        + "on a case-insensitive file system so that git records the change:";

    private readonly string _appFolder;

    /// <param name="appFolder">The folder with the app's project file, which is the content root of the app</param>
    public AppFileNameCaseDetector(string appFolder)
    {
        _appFolder = appFolder;
    }

    public MigrationResult Detect()
    {
        var findings = new List<string>();
        if (!Directory.Exists(_appFolder))
        {
            return new MigrationResult();
        }

        var root = new Listing(_appFolder);
        var config = ExpectDirectory(root, "config", findings);
        if (config is not null)
        {
            ExpectFile(config, "applicationmetadata.json", findings);
            ExpectFile(config, "assets.json", findings);
            var authorization = ExpectDirectory(config, "authorization", findings);
            if (authorization is not null)
            {
                ExpectFile(authorization, "policy.xml", findings);
            }

            var process = ExpectDirectory(config, "process", findings);
            if (process is not null)
            {
                ExpectFile(process, "process.bpmn", findings);
            }

            var texts = ExpectDirectory(config, "texts", findings);
            if (texts is not null)
            {
                foreach (var name in texts.Files)
                {
                    ExpectSpelling(texts, name, TextResourcePrefix, JsonExtension, findings);
                }
            }
        }

        var models = ExpectDirectory(root, "models", findings);
        if (models is not null)
        {
            foreach (var name in models.Files)
            {
                foreach (var suffix in _modelSuffixes)
                {
                    ExpectSpelling(models, name, prefix: "", suffix, findings);
                }
            }
        }

        var options = ExpectDirectory(root, "options", findings);
        if (options is not null)
        {
            foreach (var name in options.Files)
            {
                ExpectSpelling(options, name, prefix: "", JsonExtension, findings);
            }
        }

        var ui = ExpectDirectory(root, "ui", findings);
        if (ui is not null)
        {
            ExpectFile(ui, "Settings.json", findings);
            ExpectFile(ui, "footer.json", findings);
            foreach (var folderName in ui.Directories)
            {
                var folder = ui.Directory(folderName);
                ExpectFile(folder, "Settings.json", findings);
                var layouts = ExpectDirectory(folder, "layouts", findings);
                if (layouts is not null)
                {
                    foreach (var name in layouts.Files)
                    {
                        ExpectSpelling(layouts, name, prefix: "", JsonExtension, findings);
                    }
                }
            }
        }

        var wwwroot = ExpectDirectory(root, "wwwroot", findings);
        if (wwwroot is not null)
        {
            ExpectDirectory(wwwroot, "custom-css", findings);
            ExpectDirectory(wwwroot, "custom-js", findings);
        }

        if (findings.Count == 0)
        {
            return new MigrationResult();
        }

        findings.Sort(StringComparer.Ordinal);
        var messages = new List<UpgradeMessage>();
        messages.Todo(Summary);
        messages.WarnRange(findings);
        return new MigrationResult(messages);
    }

    /// <summary>
    /// The folder with the exact name, or null. A folder that exists with another casing is reported, and not
    /// looked into, since v9 does not find it either.
    /// </summary>
    private static Listing? ExpectDirectory(Listing parent, string name, List<string> findings)
    {
        if (parent.Directories.Contains(name))
        {
            return parent.Directory(name);
        }

        var other = parent.Directories.FirstOrDefault(d => string.Equals(d, name, StringComparison.OrdinalIgnoreCase));
        if (other is not null)
        {
            findings.Add($"{parent.RelativePath(other)}: rename the folder to {name}");
        }

        return null;
    }

    private static void ExpectFile(Listing folder, string name, List<string> findings)
    {
        if (folder.Files.Contains(name))
        {
            return;
        }

        var other = folder.Files.FirstOrDefault(f => string.Equals(f, name, StringComparison.OrdinalIgnoreCase));
        if (other is not null)
        {
            findings.Add($"{folder.RelativePath(other)}: rename the file to {name}");
        }
    }

    /// <summary>
    /// A file that would be one of the app's files if its prefix and suffix were spelled in lower case, such as
    /// <c>Resource.nb.json</c> or <c>land.JSON</c>, is reported with the spelling v9 reads.
    /// </summary>
    private static void ExpectSpelling(Listing folder, string name, string prefix, string suffix, List<string> findings)
    {
        if (
            name.Length <= prefix.Length + suffix.Length
            || !name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
            || !name.EndsWith(suffix, StringComparison.OrdinalIgnoreCase)
        )
        {
            return;
        }

        if (name.StartsWith(prefix, StringComparison.Ordinal) && name.EndsWith(suffix, StringComparison.Ordinal))
        {
            return;
        }

        var expected = prefix + name[prefix.Length..^suffix.Length] + suffix;
        if (!folder.Files.Contains(expected))
        {
            findings.Add($"{folder.RelativePath(name)}: rename the file to {expected}");
        }
    }

    private sealed class Listing
    {
        private readonly string _path;
        private readonly string _relativePath;

        public Listing(string path, string relativePath = "")
        {
            _path = path;
            _relativePath = relativePath;
            var files = new HashSet<string>(StringComparer.Ordinal);
            var directories = new HashSet<string>(StringComparer.Ordinal);
            foreach (var entry in new DirectoryInfo(path).EnumerateFileSystemInfos())
            {
                if (entry is FileInfo)
                {
                    files.Add(entry.Name);
                }
                else if (entry is DirectoryInfo)
                {
                    directories.Add(entry.Name);
                }
            }

            Files = files;
            Directories = directories;
        }

        public IReadOnlySet<string> Files { get; }

        public IReadOnlySet<string> Directories { get; }

        public Listing Directory(string name) => new(Path.Combine(_path, name), RelativePath(name));

        public string RelativePath(string name) => _relativePath.Length == 0 ? name : $"{_relativePath}/{name}";
    }
}
