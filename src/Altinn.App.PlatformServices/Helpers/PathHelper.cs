using System;
using System.IO;

namespace Altinn.App.PlatformServices.Helpers
{
    /// <summary>
    /// Helper class for Path manipulation and checks
    /// </summary>
    public static class PathHelper
    {
        /// <summary>
        /// Validates that the filePath is in the legalPath. The current path will be prefixed if the paths are relative.
        /// </summary>
        /// <param name="legalPath">The legal path</param>
        /// <param name="filePath">The file path to check</param>
        /// <returns>True for legal paths, false otherwise</returns>
        public static bool ValidateLegalFilePath(string legalPath, string filePath)
        {
            var fullRootedFolder = Path.GetFullPath(legalPath + Path.DirectorySeparatorChar);
            var expandedFilename = Path.GetFullPath(filePath);

            return expandedFilename.StartsWith(fullRootedFolder);
        }

        /// <summary>
        /// Ensures that the filePath is within the legalPath. Throws exception if the filePath is illegal.
        /// </summary>
        /// <param name="legalPath">The legal path</param>
        /// <param name="filePath">The file path to check</param>
        public static void EnsureLegalPath(string legalPath, string filePath)
        {
            if (!ValidateLegalFilePath(legalPath, filePath))
            {
                throw new ArgumentException("Invalid path", nameof(filePath));
            }
        }
    }
}
