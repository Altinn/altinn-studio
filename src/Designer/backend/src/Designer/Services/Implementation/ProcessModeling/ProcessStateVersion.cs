using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace Altinn.Studio.Designer.Services.Implementation.ProcessModeling;

// Form edits inside layout-set folders are excluded so they do not invalidate process edits.
internal static class ProcessStateVersion
{
    internal const string ProcessDefinitionPath = "App/config/process/process.bpmn";
    internal const string ApplicationMetadataPath = "App/config/applicationmetadata.json";
    internal const string PolicyPath = "App/config/authorization/policy.xml";
    private const string UiFolderPath = "App/ui";
    private static readonly string[] s_filePaths = ["App/ui/layout-sets.json", ApplicationMetadataPath, PolicyPath];

    // Use the same BPMN bytes as the response rather than reading the file again.
    internal static string Compute(string repositoryDirectory, ReadOnlySpan<byte> processDefinition)
    {
        using IncrementalHash hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        AppendFileContent(hash, ProcessDefinitionPath, processDefinition);
        AppendUiEntryNames(hash, repositoryDirectory);
        foreach (string relativePath in s_filePaths)
        {
            if (TryReadFile(Path.Combine(repositoryDirectory, relativePath)) is { } content)
            {
                AppendFileContent(hash, relativePath, content);
            }
            else
            {
                AppendMissing(hash, relativePath);
            }
        }
        return Convert.ToHexStringLower(hash.GetHashAndReset());
    }

    private static byte[]? TryReadFile(string path)
    {
        if (!File.Exists(path))
        {
            return null;
        }
        try
        {
            return File.ReadAllBytes(path);
        }
        catch (FileNotFoundException)
        {
            // File.Exists is true for a symbolic link whose target is missing.
            return null;
        }
    }

    private static void AppendFileContent(IncrementalHash hash, string relativePath, ReadOnlySpan<byte> content)
    {
        // Length-prefix content to separate adjacent hash inputs.
        hash.AppendData(Encoding.UTF8.GetBytes($"file:{relativePath}:{content.Length}\0"));
        hash.AppendData(content);
    }

    // Hidden entries such as .DS_Store are not layout sets.
    internal static string[]? GetUiEntryNames(string repositoryDirectory)
    {
        string path = Path.Combine(repositoryDirectory, UiFolderPath);
        if (!Directory.Exists(path))
        {
            return null;
        }
        return
        [
            .. Directory
                .EnumerateFileSystemEntries(path)
                .Select(entry => Path.GetFileName(entry))
                .Where(name => !name.StartsWith('.'))
                .Order(StringComparer.Ordinal),
        ];
    }

    private static void AppendUiEntryNames(IncrementalHash hash, string repositoryDirectory)
    {
        if (GetUiEntryNames(repositoryDirectory) is not { } names)
        {
            AppendMissing(hash, UiFolderPath);
            return;
        }
        hash.AppendData(Encoding.UTF8.GetBytes($"directory:{UiFolderPath}\0"));
        foreach (string name in names)
        {
            hash.AppendData(Encoding.UTF8.GetBytes($"entry:{name}\0"));
        }
    }

    private static void AppendMissing(IncrementalHash hash, string relativePath) =>
        hash.AppendData(Encoding.UTF8.GetBytes($"missing:{relativePath}\0"));
}
