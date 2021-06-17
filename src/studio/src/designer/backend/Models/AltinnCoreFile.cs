using System;
using System.IO;
using Altinn.Studio.Designer.Enums;

namespace Altinn.Studio.Designer.Models
{
    /// <summary>
    /// A entity describing a file that is part of a AltinnCore service
    /// </summary>
    public class AltinnCoreFile
    {
        /// <summary>
        /// Gets or sets the FilePath
        /// </summary>
        public string FilePath { get; set; }

        /// <summary>
        /// Relataive url to the file in the repository.
        /// </summary>
        public string RepositoryRelativeUrl { get; set; }

        /// <summary>
        /// Gets or sets the FileName
        /// </summary>
        public string FileName { get; set; }

        /// <summary>
        /// Gets or sets the FileType
        /// </summary>
        public string FileType { get; set; }

        /// <summary>
        /// Gets or sets the FileStatus
        /// </summary>
        public AltinnCoreFileStatusType FileStatus { get; set; }

        /// <summary>
        /// Gets or sets the Description
        /// </summary>
        public string Description { get; set; }

        /// <summary>
        /// Gets or sets the last changed date time 
        /// </summary>
        public DateTime LastChanged { get; set; }

        /// <summary>
        /// Creates a valid populated <see cref="AltinnCoreFile"/> object from a file path string.
        /// </summary>
        /// <param name="filePath">The complete pyshical path to the file.</param>
        /// <param name="repositoryRootPath">Root path to calculate relative url's from. This is should be the root of the repository. If it's empty or isn't a part of the filePath parameter the RepositoryRelativeUrl will be left blank.</param>        
        /// <returns></returns>
        public static AltinnCoreFile CreateFromPath(string filePath, string repositoryRootPath)
        {
            var fileInfo = new FileInfo(filePath);

            AssertFileExists(fileInfo);

            return new AltinnCoreFile
            {
                FilePath = filePath,
                FileName = fileInfo.Name,
                FileType = fileInfo.Extension,
                RepositoryRelativeUrl = GetRepositoryRelativeUrl(filePath, repositoryRootPath),
                LastChanged = fileInfo.LastWriteTime
            };
        }

        private static string GetRepositoryRelativeUrl(string filePath, string repositoryRootPath)
        {
            if (string.IsNullOrEmpty(repositoryRootPath))
            {
                return string.Empty;
            }

            if (!filePath.Contains(repositoryRootPath))
            {
                return string.Empty;
            }

            var relativeFilePath = filePath.Replace(repositoryRootPath, string.Empty);
            var relativeUrl = relativeFilePath.Replace(@"\", @"/").Replace(@"//", "/");

            return relativeUrl;
        }

        private static void AssertFileExists(FileInfo fileInfo)
        {
            if (!fileInfo.Exists)
            {
                throw new FileNotFoundException($"Could not find the file specified at: '{fileInfo.FullName}'");
            }
        }
    }
}
