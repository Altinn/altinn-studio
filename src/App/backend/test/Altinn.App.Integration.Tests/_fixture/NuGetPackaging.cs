using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Xml.Linq;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Integration.Tests;

internal static class NuGetPackaging
{
    private static readonly SemaphoreSlim _lock = new(1, 1);

    internal static async Task PackLibraries(string output, ILogger? logger, CancellationToken cancellationToken)
    {
        if (Directory.Exists(output))
            Directory.Delete(output, true);
        Directory.CreateDirectory(output);
        var solutionDirectory = ModuleInitializer.GetSolutionDirectory();

        await _lock.WaitAsync(cancellationToken);
        // Packaging always runs on the solution, so multiple pack commands in parallel
        // will conflict as they touch the same projects and files
        try
        {
            logger?.LogInformation("Making nupkg's..");
            await new Command(
                "dotnet",
                // -p:Deterministic  - ensure deterministic builds, also sets ContinuousIntegrationBuild through our src/Directory.Build.props
                // -p:DebugType      - Embed symbols in the nupkg
                // -p:IncludeSymbols - Don't generate additional snupkg-files which are not determistic and will mess with the Docker cache
                $"pack -c Release -p:Deterministic=true -p:DebugType=embedded -p:IncludeSymbols=false --output \"{output}\"",
                solutionDirectory,
                logger,
                CancellationToken: cancellationToken
            );

            await MakeNugetPackagesDeterministic(output, logger);
        }
        finally
        {
            _lock.Release();
        }
    }

    private static async Task MakeNugetPackagesDeterministic(string output, ILogger? logger)
    {
        logger?.LogInformation("Making nupkg's determnistic..");
        var nupkgFiles = Directory.GetFiles(output, "*.nupkg");
        Assert.NotEmpty(nupkgFiles);
        var tcs = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        // Run on a separate (non-threadpool) thread to avoid any blocking issues
        // These ZipFile operations don't seem to have async equivalents..
        var thread = new Thread(() =>
        {
            try
            {
                foreach (var nupkgFile in nupkgFiles)
                {
                    // Repack the NuGet package to ensure deterministic builds
                    RepackNugetPackage(nupkgFile, _defaultDateTime);
                }
                logger?.LogInformation("Repackaging NuGet packages for determinism succeeded");
                tcs.SetResult();
            }
            catch (Exception ex)
            {
                logger?.LogError(ex, "An error occurred while making NuGet packages deterministic");
                tcs.SetException(ex);
            }
        });
        thread.Name = "NuGetPackaging.Determinism";
        thread.Start();
        await tcs.Task;
    }

    // The below is based on this CLI:
    // https://github.com/Kuinox/NupkgDeterministicator/blob/4ee0172d903144e1f745a64d0646ce6240f31a52/Kuinox.NupkgDeterministicator/Program.cs
    private static readonly DateTime _defaultDateTime = new(2025, 8, 12, 0, 0, 0, DateTimeKind.Utc);

    private static void RepackNugetPackage(string path, DateTime dateTime)
    {
        var tempDir = Path.Join(Path.GetTempPath(), Path.GetRandomFileName());
        var libDir = Path.Join(tempDir, "lib");
        var relsFile = Path.Join(tempDir, "_rels", ".rels");

        try
        {
            Directory.CreateDirectory(tempDir);

            List<string> fileList = UnzipPackage(path, tempDir);

            string newPsmdcpName = CalcPsmdcpName(libDir);
            string newPsmdcpPath = RenamePsmdcp(tempDir, newPsmdcpName);
            EditManifestRelationships(relsFile, newPsmdcpPath);
            int index = fileList.FindIndex(x => x.Contains(".psmdcp"));
            fileList[index] = newPsmdcpPath;

            ZipDirectory(path, tempDir, fileList, dateTime);
        }
        finally
        {
            Directory.Delete(tempDir, true);
        }
    }

    private static List<string> UnzipPackage(string package, string dest)
    {
        ZipFile.ExtractToDirectory(package, dest);
        var fileList = new List<string>();
        using (var s = ZipFile.OpenRead(package))
        {
            foreach (var entry in s.Entries)
            {
                fileList.Add(entry.FullName);
            }
        }
        return fileList;
    }

    private static string CalcPsmdcpName(string libDir)
    {
        using var sha = SHA256.Create();
        if (Directory.Exists(libDir))
        {
            foreach (string file in Directory.EnumerateFiles(libDir, "*", SearchOption.AllDirectories))
            {
                byte[] data = File.ReadAllBytes(file);
                sha.TransformBlock(data, 0, data.Length, data, 0);
            }
        }
        sha.TransformFinalBlock(Array.Empty<byte>(), 0, 0);

        return ToHexString(sha.Hash!).ToLower().Substring(0, 32);
    }

    private static string RenamePsmdcp(string packageDir, string name)
    {
        string fileName = Directory.EnumerateFiles(packageDir, "*.psmdcp", SearchOption.AllDirectories).Single();
        string newFileName = Path.Join(Path.GetDirectoryName(fileName)!, name + ".psmdcp");

        if (fileName != newFileName)
            Directory.Move(fileName, newFileName);

        return Path.GetRelativePath(packageDir, newFileName).Replace('\\', '/');
    }

    private static void EditManifestRelationships(string path, string psmdcpPath)
    {
        XDocument doc = XDocument.Load(path);
        XNamespace ns = doc.Root!.GetDefaultNamespace();

        foreach (XElement rs in doc.Root.Elements(ns + "Relationship"))
        {
            using var sha = SHA256.Create();
            if (rs.Attribute("Target")!.Value.Contains(".psmdcp"))
            {
                rs.Attribute("Target")!.Value = "/" + psmdcpPath;
            }

            string s = "/" + psmdcpPath + rs.Attribute("Target")!.Value;
            byte[] hash = sha.ComputeHash(Encoding.UTF8.GetBytes(s));
            string id = string.Concat("R", ToHexString(hash).AsSpan(0, 16));
            rs.Attribute("Id")!.Value = id;
        }

        doc.Save(path);
    }

    private static string ToHexString(byte[] arr) => BitConverter.ToString(arr).ToLower().Replace("-", "");

    private static void ZipDirectory(string outFile, string directory, IEnumerable<string> files, DateTime dateTime)
    {
        using var s = new ZipArchive(File.Create(outFile), ZipArchiveMode.Create);
        foreach (string filePath in files)
        {
            var entry = s.CreateEntry(filePath);
            entry.LastWriteTime = dateTime;
            using var fs = File.OpenRead(Path.Join(directory, filePath));
            using var entryS = entry.Open();
            fs.CopyTo(entryS);
        }
    }
}
