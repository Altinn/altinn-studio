using System.Collections.Generic;
using System.IO;
using System.Threading;

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
            List<string> failedFiles = new List<string>();

            DirectoryInfo directoryToDeleteInfo = new DirectoryInfo(directoryToDelete);

            if (!directoryToDeleteInfo.Exists)
            {
                throw new DirectoryNotFoundException($"Directory does not exist or could not be found: {directoryToDelete}");
            }

            DirectoryInfo[] subDirectories = directoryToDeleteInfo.GetDirectories();

            FileInfo[] files = directoryToDeleteInfo.GetFiles();

            foreach (FileInfo file in files)
            {
                File.SetAttributes(file.FullName, FileAttributes.Normal);

                try
                {
                    File.Delete(file.FullName);
                }
                catch (IOException)
                {
                    failedFiles.Add(file.FullName);
                }
            }

            if (failedFiles.Count > 0)
            {
                Thread.Sleep(1000);

                foreach (string file in failedFiles)
                {
                    try
                    {
                        File.Delete(file);
                    }
                    catch (IOException)
                    {
                        // if second attempt fails, it is handles when the directory is deleted
                    }
                }
            }

            foreach (DirectoryInfo directory in subDirectories)
            {
                DeleteFilesAndDirectory(directory.FullName);
            }

            File.SetAttributes(directoryToDeleteInfo.FullName, FileAttributes.Normal);
            Directory.Delete(directoryToDeleteInfo.FullName, true);
        }
    }
}
