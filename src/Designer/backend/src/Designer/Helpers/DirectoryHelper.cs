#nullable disable
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.FileSystemGlobbing;
using Microsoft.Extensions.FileSystemGlobbing.Abstractions;

namespace Altinn.Studio.Designer.Helpers
{
    /// <summary>
    /// Helper class for directories
    /// </summary>
    public static class DirectoryHelper
    {
        /// <summary>
        /// Deleted all files and subdirectories before deleting the directory.
        /// </summary>
        /// <param name="directoryToDelete">Full path to the directory.</param>
        public static void DeleteFilesAndDirectory(string directoryToDelete)
        {
            DirectoryInfo directoryToDeleteInfo = new DirectoryInfo(directoryToDelete);

            if (!directoryToDeleteInfo.Exists)
            {
                return;
            }

            DirectoryInfo[] subDirectories = directoryToDeleteInfo.GetDirectories();

            FileInfo[] files = directoryToDeleteInfo.GetFiles();
            foreach (FileInfo file in files)
            {
                File.SetAttributes(file.FullName, FileAttributes.Normal);
                File.Delete(file.FullName);
            }

            foreach (DirectoryInfo directory in subDirectories)
            {
                DeleteFilesAndDirectory(directory.FullName);
            }

            File.SetAttributes(directoryToDeleteInfo.FullName, FileAttributes.Normal);
            Directory.Delete(directoryToDeleteInfo.FullName);
        }

        public static IEnumerable<string> ResolveFilesFromPattern(string baseDirectory, string pattern)
        {
            var matcher = new Matcher(StringComparison.OrdinalIgnoreCase);
            matcher.AddInclude(pattern);

            var result = matcher.Execute(
                new DirectoryInfoWrapper(new DirectoryInfo(baseDirectory))
            );

            return result.Files.Select(f => Path.Combine(baseDirectory, f.Path));
        }

        public static async Task CopyDirectoryAsync(string sourceDir, string targetDir)
        {
            DirectoryInfo source = new(sourceDir);
            DirectoryInfo target = new(targetDir);

            foreach (FileInfo file in source.GetFiles())
            {
                File.SetAttributes(file.FullName, FileAttributes.Normal);

                string targetPath = Path.Combine(target.FullName, file.Name);
                await using FileStream sourceStream = file.OpenRead();
                await using FileStream targetStream = File.Create(targetPath);
                await sourceStream.CopyToAsync(targetStream);
            }

            foreach (DirectoryInfo subDir in source.GetDirectories())
            {
                DirectoryInfo nextTargetSubDir = target.CreateSubdirectory(subDir.Name);
                await CopyDirectoryAsync(subDir.FullName, nextTargetSubDir.FullName);
            }
        }
    }
}
