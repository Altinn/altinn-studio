using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

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
                throw new DirectoryNotFoundException($"Directory does not exist or could not be found: {directoryToDelete}");
            }

            DirectoryInfo[] subDirectories = directoryToDeleteInfo.GetDirectories();

            FileInfo[] files = directoryToDeleteInfo.GetFiles();
            foreach (FileInfo file in files)
            {
                File.Delete(file.FullName);
            }

            foreach (DirectoryInfo directory in subDirectories)
            {
                DeleteFilesAndDirectory(directory.FullName);
            }

            Directory.Delete(directoryToDeleteInfo.FullName);
        }
    }
}
