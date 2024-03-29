using System.IO;

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
    }
}
