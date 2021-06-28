using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Services.Interfaces;

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
        /// <param name="repositoriesRootDirectory">Base path (full) for where the repository recides on-disk.</param>
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
        /// Root path for where the repositories recides on-disk.        
        /// </summary>
        public string RepositoriesRootDirectory { get; private set; }

        /// <summary>
        /// Full path to where this particular repository recides on-disk.
        /// </summary>
        public string RepositoryDirectory { get; private set; }

        /// <summary>
        /// Find all files based on the specified search pattern(s). If multiple patterns are provided
        /// a search will be done for each pattern and the resultsets will be merged. The search is
        /// case insensitive.
        /// </summary>
        /// <param name="searchPatterns">The pattern to search for ie. *.json.schema.</param>
        /// <param name="recursive">True if it should search recursively through all sub-folders, false if it should only search the provided folder.</param>
        /// <returns></returns>
        public IEnumerable<string> FindFiles(string[] searchPatterns, bool recursive = true)
        {
            var files = new List<string>();

            foreach (var searchPattern in searchPatterns)
            {
                var foundFiles = Directory.EnumerateFiles(RepositoryDirectory, searchPattern, new EnumerationOptions { MatchCasing = MatchCasing.CaseInsensitive, RecurseSubdirectories = recursive });                
                files.AddRange(foundFiles);
            }

            return files;
        }

        /// <summary>
        /// Returns the content of a file absolute path within the repository directory.
        /// </summary>        
        /// <param name="absoluteFilePath">The relative path to the file.</param>
        /// <returns>A string containing the file content</returns>
        public async Task<string> ReadTextByAbsolutePathAsync(string absoluteFilePath)
        {
            Guard.AssertFilePathWithinParentDirectory(RepositoryDirectory, absoluteFilePath);

            return await ReadTextAsync(absoluteFilePath);
        }

        /// <summary>
        /// Returns the content of a file path relative to the repository directory
        /// </summary>        
        /// <param name="relativeFilePath">The relative path to the file.</param>
        /// <returns>A string containing the file content</returns>
        public async Task<string> ReadTextByRelativePathAsync(string relativeFilePath)
        {
            var absoluteFilePath = GetAbsoluteFilePathSanitized(relativeFilePath);

            Guard.AssertFilePathWithinParentDirectory(RepositoryDirectory, absoluteFilePath);

            // In a weird case this returns something else than the one below on one character in 0678.xsd. return await ReadTextAsync(absoluteFilePath);
            return await File.ReadAllTextAsync(absoluteFilePath, Encoding.UTF8);            
        }

        /// <summary>
        /// Creates a new file or overwrites an existing and writes the text to the specified file path.
        /// </summary>
        /// <param name="relativeFilePath">File to be created/updated.</param>
        /// <param name="text">Text content to be written to the file.</param>        
        public async Task WriteTextByRelativePathAsync(string relativeFilePath, string text)
        {
            var absoluteFilePath = GetAbsoluteFilePathSanitized(relativeFilePath);

            Guard.AssertFilePathWithinParentDirectory(RepositoryDirectory, absoluteFilePath);

            await WriteTextAsync(absoluteFilePath, text);
        }        

        /// <summary>
        /// Deletes the specified file
        /// </summary>
        /// <param name="relativeFilePath">Relative path to file to be deleted.</param>
        public void DeleteFileByRelativePath(string relativeFilePath)
        {
            var absoluteFilePath = GetAbsoluteFilePathSanitized(relativeFilePath);

            Guard.AssertFilePathWithinParentDirectory(RepositoryDirectory, absoluteFilePath);

            File.Delete(absoluteFilePath);
        }

        /// <summary>
        /// Checks if a file exists within the repository.
        /// </summary>
        /// <param name="relativeFilePath">Relative path to file to check for existense.</param>        
        public bool FileExistsByRelativePath(string relativeFilePath)
        {
            var absoluteFilePath = GetAbsoluteFilePathSanitized(relativeFilePath);

            if (!absoluteFilePath.StartsWith(RepositoryDirectory))
            {
                return false;
            }

            return File.Exists(absoluteFilePath);
        }

        /// <summary>
        /// Gets the absolute path for a file given a repository relative path.
        /// </summary>
        /// <param name="relativeFilePath">Relative path to the file to get the absolute path for.</param>        
        protected string GetAbsoluteFilePathSanitized(string relativeFilePath)
        {
            if (relativeFilePath.StartsWith("/") || relativeFilePath.StartsWith("\\"))
            {
                relativeFilePath = relativeFilePath[1..];
            }

            // We do this to avoid paths like c:\altinn\repositories\developer\org\repo\..\..\somefile.txt
            // By first combining the paths, the getting the full path you will get c:\altinn\repositories\developer\org\repo\somefile.txt
            // This also makes it easier to avoid people trying to get outside their repository directory.
            var absoluteFilePath = Path.Combine(new string[] { RepositoryDirectory, relativeFilePath });
            absoluteFilePath = Path.GetFullPath(absoluteFilePath);

            return absoluteFilePath;
        }

        private static async Task<string> ReadTextAsync(string absoluteFilePath)
        {
            using var sourceStream = new FileStream(absoluteFilePath, FileMode.Open, FileAccess.Read, FileShare.Read, bufferSize: 4096, useAsync: true);

            var sb = new StringBuilder();

            byte[] buffer = new byte[0x1000];
            int numRead;
            while ((numRead = await sourceStream.ReadAsync(buffer.AsMemory(0, buffer.Length))) != 0)
            {
                string text = Encoding.UTF8.GetString(buffer, 0, numRead);
                sb.Append(text);
            }

            return sb.ToString();
        }

        private static async Task WriteTextAsync(string absoluteFilePath, string text)
        {
            byte[] encodedText = Encoding.UTF8.GetBytes(text);
            using var sourceStream = new FileStream(absoluteFilePath, FileMode.Create, FileAccess.Write, FileShare.None, bufferSize: 4096, useAsync: true);
            await sourceStream.WriteAsync(encodedText.AsMemory(0, encodedText.Length));
        }
    }
}
