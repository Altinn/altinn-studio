using System.IO;

namespace AltinnCore.Common.Configuration
{
    /// <summary>
    /// The DefaultFileFactory interface.
    /// </summary>
    public interface IDefaultFileFactory
    {
        /// <summary>
        /// The get default file. Will check organization folder, then the default folder within static file root.
        /// </summary>
        /// <param name="fileName">The file name.</param>
        /// <param name="org">The org.</param>
        /// <returns> The <see cref="FileInfo"/>. This method does not check if the file exist. </returns>
        FileInfo GetJsonDefaultFile(string fileName, string org = null);

        /// <summary>
        /// Get default web app file
        /// </summary>
        /// <param name="fileName">the file name</param>
        /// <param name="org">the organisation</param>
        /// <returns>The web app default file</returns>
        FileInfo GetWebAppDefaultFile(string fileName, string org = null);

        /// <summary>
        /// Get the default styles file for React app
        /// </summary>
        /// <param name="fileName">the file name</param>
        /// <param name="org">the organisation</param>
        /// <returns>The default styles file</returns>
        FileInfo GetWebAppStyleDefaultFile(string fileName, string org = null);
    }
}
