using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Helpers;

namespace Altinn.Studio.Designer.Infrastructure.GitRepository
{
    /// <summary>
    /// Base class for handling files in a Git Repository.
    /// </summary>
    public class GitRepository
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="GitRepository"/> class.
        /// </summary>
        /// <param name="repositoriesRootDirectory">Base path (full) for where the repository resides on-disk.</param>
        /// <param name="repositoryDirectory">Full path to the root directory of this repository on-disk.</param>
        public GitRepository(string repositoriesRootDirectory, string repositoryDirectory)
        {
            Guard.AssertDirectoryExists(repositoriesRootDirectory);
            Guard.AssertDirectoryExists(repositoryDirectory);

            // We do this re-assignment to ensure OS independent paths.
            RepositoriesRootDirectory = Path.GetFullPath(repositoriesRootDirectory);
            RepositoryDirectory = Path.GetFullPath(repositoryDirectory);

            Guard.AssertSubDirectoryWithinParentDirectory(RepositoriesRootDirectory, RepositoryDirectory);
        }

        /// <summary>
        /// Root path for where the repositories resides on-disk.
        /// </summary>
        public string RepositoriesRootDirectory { get; private set; }

        /// <summary>
        /// Full path to where this particular repository resides on-disk.
        /// </summary>
        public string RepositoryDirectory { get; private set; }

        /// <summary>
        /// Find all files based on the specified search pattern(s). If multiple patterns are provided
        /// a search will be done for each pattern and the result sets will be merged. The search is
        /// case insensitive.
        /// </summary>
        /// <param name="searchPatterns">The pattern to search for ie. *.json.schema.</param>
        /// <param name="recursive">True if it should search recursively through all sub-folders, false if it should only search the provided folder.</param>
        public IEnumerable<string> FindFiles(string[] searchPatterns, bool recursive = true)
        {
            List<string> files = new();

            foreach (string searchPattern in searchPatterns)
            {
                IEnumerable<string> foundFiles = Directory.EnumerateFiles(RepositoryDirectory, searchPattern, new EnumerationOptions { MatchCasing = MatchCasing.CaseInsensitive, RecurseSubdirectories = recursive });
                files.AddRange(foundFiles);
            }

            return files;
        }

        /// <summary>
        /// Gets all the files within the specified directory.
        /// </summary>
        /// <param name="relativeDirectory">Relative path to a directory within the repository.</param>
        /// <param name="patternMatch">An optional pattern that the retrieved files must match</param>
        /// <param name="searchInSubdirectories">An optional parameter to also get files in sub directories</param>
        protected string[] GetFilesByRelativeDirectory(string relativeDirectory, string patternMatch = null, bool searchInSubdirectories = false)
        {
            string absoluteDirectory = GetAbsoluteFileOrDirectoryPathSanitized(relativeDirectory);

            Guard.AssertFilePathWithinParentDirectory(RepositoryDirectory, absoluteDirectory);

            SearchOption searchOption = searchInSubdirectories ? SearchOption.AllDirectories : SearchOption.TopDirectoryOnly;

            string searchPatternMatch = patternMatch ?? "*.*";

            return Directory.GetFiles(absoluteDirectory, searchPatternMatch, searchOption);
        }

        /// <summary>
        /// Gets all the files within the specified directory in an alphabetically sorted order.
        /// </summary>
        /// <param name="relativeDirectory">Relative path to a directory within the repository.</param>
        /// <param name="patternMatch">An optional pattern that the retrieved files must match</param>
        /// <param name="searchInSubdirectories">An optional parameter to also get files in sub directories</param>
        protected string[] GetFilesByRelativeDirectoryAscSorted(string relativeDirectory, string patternMatch = null, bool searchInSubdirectories = false)
        {
            string[] fileNames = GetFilesByRelativeDirectory(relativeDirectory, patternMatch, searchInSubdirectories);

            return fileNames.OrderBy(path => path, StringComparer.OrdinalIgnoreCase).ToArray();
        }

        /// <summary>
        /// Gets all the directories within the specified directory.
        /// </summary>
        /// <param name="relativeDirectory">Relative path to a directory within the repository.</param>
        protected string[] GetDirectoriesByRelativeDirectory(string relativeDirectory)
        {
            string absoluteDirectory = GetAbsoluteFileOrDirectoryPathSanitized(relativeDirectory);

            Guard.AssertFilePathWithinParentDirectory(RepositoryDirectory, absoluteDirectory);

            string[] directories = Directory.GetDirectories(absoluteDirectory).Select(dir => new DirectoryInfo(dir).Name).ToArray();

            return directories;
        }

        /// <summary>
        /// Returns the content of a file absolute path within the repository directory.
        /// </summary>
        /// <param name="absoluteFilePath">The relative path to the file.</param>
        /// <returns>A string containing the file content</returns>
        protected async Task<string> ReadTextByAbsolutePathAsync(string absoluteFilePath)
        {
            Guard.AssertFilePathWithinParentDirectory(RepositoryDirectory, absoluteFilePath);

            // Commented out ref comment below in the ReadTextByRelativePathAsync methdod
            // return await ReadTextAsync(absoluteFilePath)
            return await File.ReadAllTextAsync(absoluteFilePath, Encoding.UTF8);
        }

        /// <summary>
        /// Returns the content of a file path relative to the repository directory
        /// </summary>
        /// <param name="relativeFilePath">The relative path to the file.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation in cancelled</param>
        /// <returns>A string containing the file content</returns>
        public async Task<string> ReadTextByRelativePathAsync(string relativeFilePath, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            string absoluteFilePath = GetAbsoluteFileOrDirectoryPathSanitized(relativeFilePath);

            Guard.AssertFilePathWithinParentDirectory(RepositoryDirectory, absoluteFilePath);

            // In some weird cases these two alternate ways of reading a file sometimes works while the other fails.
            // Experienced in both 0678.xsd in ttd-datamodels and resource.en.json in hvem-er-hvem.
            // Opening the file in an editor and saving it resolved the issue for 0678.xsd. Is most likely related to BOM
            // and that the BOM bytes isn't removed on read in the ReadTextAsync method.
            // Should try to fix this as this method is more performant than ReadAllTextAsync.
            // return await ReadTextAsync(absoluteFilePath)
            try
            {
                File.SetAttributes(absoluteFilePath, FileAttributes.Normal);
                return await File.ReadAllTextAsync(absoluteFilePath, Encoding.UTF8, cancellationToken);
            }
            catch (IOException)
            {
                Thread.Sleep(1000);
                File.SetAttributes(absoluteFilePath, FileAttributes.Normal);
                return await File.ReadAllTextAsync(absoluteFilePath, Encoding.UTF8, cancellationToken);
            }
        }

        /// <summary>
        /// Returns fileStream of a file path relative to the repository directory.
        /// </summary>
        /// <param name="relativeFilePath">The relative path to the file.</param>
        /// <returns>A <see cref="Stream"/>.</returns>
        public Stream OpenStreamByRelativePath(string relativeFilePath)
        {
            string absoluteFilePath = GetAbsoluteFileOrDirectoryPathSanitized(relativeFilePath);

            Guard.AssertFilePathWithinParentDirectory(RepositoryDirectory, absoluteFilePath);

            return File.OpenRead(absoluteFilePath);
        }

        /// <summary>
        /// Creates a new file or overwrites an existing and writes the text to the specified file path.
        /// </summary>
        /// <param name="relativeFilePath">File to be created/updated.</param>
        /// <param name="text">Text content to be written to the file.</param>
        /// <param name="createDirectory">False (default) if you don't want missing directory to be created. True will check if the directory exist and create it if it don't exist.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation in cancelled</param>
        public async Task WriteTextByRelativePathAsync(string relativeFilePath, string text, bool createDirectory = false, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            Guard.AssertNotNullOrEmpty(relativeFilePath, nameof(relativeFilePath));

            string absoluteFilePath = GetAbsoluteFileOrDirectoryPathSanitized(relativeFilePath);

            Guard.AssertFilePathWithinParentDirectory(RepositoryDirectory, absoluteFilePath);

            if (createDirectory)
            {
                CreateDirectory(absoluteFilePath);
            }

            await WriteTextAsync(absoluteFilePath, text, cancellationToken);
        }

        /// <summary>
        /// Creates a new file or overwrites an existing and writes the text to the specified file path.
        /// </summary>
        /// <param name="relativeFilePath">File to be created/updated.</param>
        /// <param name="stream">Content to be written to the file.</param>
        /// <param name="createDirectory">False (default) if you don't want missing directory to be created. True will check if the directory exist and create it if it don't exist.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation in cancelled</param>
        public async Task WriteStreamByRelativePathAsync(string relativeFilePath, Stream stream, bool createDirectory = false, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            Guard.AssertNotNullOrEmpty(relativeFilePath, nameof(relativeFilePath));

            string absoluteFilePath = GetAbsoluteFileOrDirectoryPathSanitized(relativeFilePath);

            Guard.AssertFilePathWithinParentDirectory(RepositoryDirectory, absoluteFilePath);

            if (createDirectory)
            {
                CreateDirectory(absoluteFilePath);
            }

            await WriteAsync(absoluteFilePath, stream, cancellationToken);
        }

        /// <summary>
        /// Creates a new file or overwrites an existing and writes the text to the specified file path.
        /// </summary>
        /// <param name="relativeFilePath">File to be created/updated.</param>
        /// <param name="obj">Object to be written to the file.</param>
        /// <param name="createDirectory">False (default) if you don't want missing directory to be created. True will check if the directory exist and create it if it don't exist.</param>
        protected async Task WriteObjectByRelativePathAsync(string relativeFilePath, object obj, bool createDirectory = false)
        {
            string studioSettingsJson = JsonSerializer.Serialize(obj, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, Converters = { new JsonStringEnumConverter() }, WriteIndented = true });

            await WriteTextByRelativePathAsync(relativeFilePath, studioSettingsJson, createDirectory);
        }

        /// <summary>
        /// Deletes the specified file
        /// </summary>
        /// <param name="relativeFilePath">Relative path to file to be deleted.</param>
        public void DeleteFileByRelativePath(string relativeFilePath)
        {
            Guard.AssertNotNullOrEmpty(relativeFilePath, nameof(relativeFilePath));

            string absoluteFilePath = GetAbsoluteFileOrDirectoryPathSanitized(relativeFilePath);

            Guard.AssertFilePathWithinParentDirectory(RepositoryDirectory, absoluteFilePath);

            File.Delete(absoluteFilePath);
        }

        /// <summary>
        /// Deletes the specified file
        /// </summary>
        /// <param name="absoluteFilePath">Absolute path to file to be deleted.</param>
        public void DeleteFileByAbsolutePath(string absoluteFilePath)
        {
            Guard.AssertNotNullOrEmpty(absoluteFilePath, nameof(absoluteFilePath));
            Guard.AssertFilePathWithinParentDirectory(RepositoryDirectory, absoluteFilePath);

            File.Delete(absoluteFilePath);
        }

        /// <summary>
        /// Move the specified file to specified destination
        /// </summary>
        /// <param name="sourceRelativeFilePath">Relative path to file to be moved.</param>
        /// <param name="destRelativeFilePath">Relative path to destination of moved file.</param>
        /// <param name="destinationFileName">FileName for the destination file</param>
        protected void MoveFileByRelativePath(string sourceRelativeFilePath, string destRelativeFilePath, string destinationFileName)
        {
            if (!FileExistsByRelativePath(sourceRelativeFilePath))
            {
                throw new FileNotFoundException($"File {sourceRelativeFilePath} does not exist.");
            }

            if (FileExistsByRelativePath(destRelativeFilePath))
            {
                throw new IOException($"Suggested file name {destinationFileName} already exists.");
            }
            string sourceAbsoluteFilePath = GetAbsoluteFileOrDirectoryPathSanitized(sourceRelativeFilePath);
            string destAbsoluteFilePath = GetAbsoluteFileOrDirectoryPathSanitized(destRelativeFilePath);
            string destAbsoluteParentDirPath = destAbsoluteFilePath.Remove(destAbsoluteFilePath.IndexOf(destinationFileName, StringComparison.Ordinal));
            Directory.CreateDirectory(destAbsoluteParentDirPath);
            Guard.AssertFilePathWithinParentDirectory(RepositoryDirectory, sourceAbsoluteFilePath);
            Guard.AssertFilePathWithinParentDirectory(RepositoryDirectory, destAbsoluteFilePath);

            File.Move(sourceAbsoluteFilePath, destAbsoluteFilePath);
        }

        /// <summary>
        /// Move the specified folder to specified destination
        /// </summary>
        /// <param name="sourceRelativeDirectoryPath">Relative path to folder to be moved.</param>
        /// <param name="destRelativeDirectoryPath">Relative path to destination of moved folder.</param>
        protected void MoveDirectoryByRelativePath(string sourceRelativeDirectoryPath, string destRelativeDirectoryPath)
        {
            if (!DirectoryExistsByRelativePath(sourceRelativeDirectoryPath))
            {
                throw new DirectoryNotFoundException($"Directory {sourceRelativeDirectoryPath} does not exist.");
            }
            if (DirectoryExistsByRelativePath(destRelativeDirectoryPath))
            {
                throw new IOException($"Suggested directory {destRelativeDirectoryPath} already exists.");
            }
            string sourceAbsoluteDirectoryPath = GetAbsoluteFileOrDirectoryPathSanitized(sourceRelativeDirectoryPath);
            string destAbsoluteDirectoryPath = GetAbsoluteFileOrDirectoryPathSanitized(destRelativeDirectoryPath);
            Guard.AssertFilePathWithinParentDirectory(RepositoryDirectory, sourceAbsoluteDirectoryPath);
            Guard.AssertFilePathWithinParentDirectory(RepositoryDirectory, destAbsoluteDirectoryPath);

            Directory.Move(sourceAbsoluteDirectoryPath, destAbsoluteDirectoryPath);
        }

        /// <summary>
        /// Checks if a file exists within the repository.
        /// </summary>
        /// <param name="relativeFilePath">Relative path to file to check for existence.</param>
        public bool FileExistsByRelativePath(string relativeFilePath)
        {
            string absoluteFilePath = GetAbsoluteFileOrDirectoryPathSanitized(relativeFilePath);

            if (!absoluteFilePath.StartsWith(RepositoryDirectory))
            {
                return false;
            }

            return File.Exists(absoluteFilePath);
        }

        /// <summary>
        /// Checks if a directory exists within the repository.
        /// </summary>
        /// <param name="relativeDirectoryPath">Relative path to directory to check for existence.</param>
        public bool DirectoryExistsByRelativePath(string relativeDirectoryPath)
        {
            string absoluteDirectoryPath = GetAbsoluteFileOrDirectoryPathSanitized(relativeDirectoryPath);

            if (!absoluteDirectoryPath.StartsWith(RepositoryDirectory))
            {
                return false;
            }

            return Directory.Exists(absoluteDirectoryPath);
        }

        /// <summary>
        /// Copies the contents of the repository to the target directory.
        /// </summary>
        /// <param name="targetDirectory">Full path of the target directory</param>
        public void CopyRepository(string targetDirectory)
        {
            Guard.AssertFilePathWithinParentDirectory(RepositoriesRootDirectory, targetDirectory);

            Directory.CreateDirectory(targetDirectory);
            CopyAll(RepositoryDirectory, targetDirectory);
        }

        /// <summary>
        /// Replaces all instances of search string with replace string in file in the provided path.
        /// </summary>
        /// <param name="relativePath">The relative path to the file.</param>
        /// <param name="searchString">The search string.</param>
        /// <param name="replaceString">The replace string.</param>
        public async Task SearchAndReplaceInFile(string relativePath, string searchString, string replaceString)
        {
            string text = await ReadTextByRelativePathAsync(relativePath);
            text = text.Replace(searchString, replaceString);

            await WriteTextByRelativePathAsync(relativePath, text);
        }

        private static void CopyAll(string sourceDirectory, string targetDirectory)
        {
            DirectoryInfo source = new(sourceDirectory);
            DirectoryInfo target = new(targetDirectory);

            foreach (FileInfo file in source.GetFiles())
            {
                File.SetAttributes(file.FullName, FileAttributes.Normal);
                file.CopyTo(Path.Combine(target.FullName, file.Name), true);
            }

            foreach (DirectoryInfo subDirectory in source.GetDirectories())
            {
                DirectoryInfo nextTargetSubDir =
                    target.CreateSubdirectory(subDirectory.Name);
                CopyAll(subDirectory.FullName, nextTargetSubDir.FullName);
            }
        }

        /// <summary>
        /// Gets the absolute path for a file given a repository relative path.
        /// </summary>
        /// <param name="relativeFilePath">Relative path to the file to get the absolute path for.</param>
        protected string GetAbsoluteFileOrDirectoryPathSanitized(string relativeFilePath)
        {
            if (relativeFilePath.StartsWith("/") || relativeFilePath.StartsWith("\\"))
            {
                relativeFilePath = relativeFilePath[1..];
            }

            // We do this to avoid paths like c:\altinn\repositories\developer\org\repo\..\..\somefile.txt
            // By first combining the paths, the getting the full path you will get c:\altinn\repositories\developer\org\repo\somefile.txt
            // This also makes it easier to avoid people trying to get outside their repository directory.
            relativeFilePath = relativeFilePath.Replace('\\', Path.DirectorySeparatorChar);
            string absoluteFilePath = Path.Combine(RepositoryDirectory, relativeFilePath);
            absoluteFilePath = Path.GetFullPath(absoluteFilePath);
            return absoluteFilePath;
        }

        private static void CreateDirectory(string absoluteFilePath)
        {
            var fileInfo = new FileInfo(absoluteFilePath);
            if (!Directory.Exists(fileInfo.Directory.FullName))
            {
                Directory.CreateDirectory(fileInfo.Directory.FullName);
            }
        }

        private static async Task<string> ReadTextAsync(string absoluteFilePath)
        {
            await using FileStream sourceStream = new(absoluteFilePath, FileMode.Open, FileAccess.Read, FileShare.Read, bufferSize: 4096, useAsync: true);

            StringBuilder sb = new();

            byte[] buffer = new byte[0x1000];
            int numRead;
            while ((numRead = await sourceStream.ReadAsync(buffer.AsMemory(0, buffer.Length))) != 0)
            {
                string text = Encoding.UTF8.GetString(buffer, 0, numRead);
                sb.Append(text);
            }

            return sb.ToString();
        }

        private static async Task WriteTextAsync(string absoluteFilePath, string text, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            byte[] encodedText = Encoding.UTF8.GetBytes(text);
            await using FileStream sourceStream = new(absoluteFilePath, FileMode.Create, FileAccess.Write, FileShare.None, bufferSize: 4096, useAsync: true);
            await sourceStream.WriteAsync(encodedText.AsMemory(0, encodedText.Length), cancellationToken);
        }

        private static async Task WriteAsync(string absoluteFilePath, Stream stream, CancellationToken cancellationToken = default)
        {
            await using FileStream targetStream = new(absoluteFilePath, FileMode.Create, FileAccess.Write, FileShare.None, bufferSize: 4096, useAsync: true);
            await stream.CopyToAsync(targetStream, bufferSize: 4096, cancellationToken: cancellationToken);
        }
    }
}
