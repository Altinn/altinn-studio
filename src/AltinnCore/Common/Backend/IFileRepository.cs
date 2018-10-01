using System.Collections.Generic;

namespace AltinnCore.Common.Backend
{
    /// <summary>
    /// Interface for accessing files in a repository so that different implementations can be supported (GIT, SQL Server, etc).
    /// </summary>
    public interface IFileRepository
    {
        /// <summary>
        /// Gets the repository name
        /// </summary>
        string RepositoryName { get; }

        /// <summary>
        /// Gets the repository remote URL
        /// </summary>
        string Url { get; }

        /// <summary>
        /// Gets the repository local path
        /// </summary>
        string Path { get; }

        /// <summary>
        /// Pull data from remote repository
        /// </summary>
        /// <returns>Status text</returns>
        string Pull();

        /// <summary>
        /// Push added or changed files to remote repository
        /// </summary>
        void Push();

        /// <summary>
        /// Add a new file to local repository, and then push it to remote
        /// </summary>
        /// <param name="filename">The name of the file to add</param>
        /// <param name="contents">Contents of the added file</param>
        /// <param name="folder">The folder relative to the repository"></param>
        void Add(string filename, string contents, string folder);

        /// <summary>
        /// Get file content
        /// </summary>
        /// <param name="path">The file path and name relative to the repository</param>
        /// <returns>File content, or null if file does not exist</returns>
        string GetFileContent(string path);

        /// <summary>
        /// Returns all the files in the repo
        /// </summary>
        /// <returns>All files</returns>
        List<string> AllFiles();
    }
}
