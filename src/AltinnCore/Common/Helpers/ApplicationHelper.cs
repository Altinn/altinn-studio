using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

namespace AltinnCore.Common.Helpers
{
    /// <summary>
    /// helper class for functionalities related to application or application meta data
    /// </summary>
    public static class ApplicationHelper
    {
        /// <summary>
        /// Gets the application id  (appId) formatted as "org/appName"
        /// </summary>
        /// <param name="org">the application owner</param>
        /// <param name="appName">the application name</param>
        /// <returns></returns>
        public static string GetFormattedApplicationId(string org, string appName)
        {
            return $"{org}/{appName}";
        }

        /// <summary>
        /// Validates the filename
        /// </summary>
        /// <param name="fileName">the file name</param>
        /// <returns>false if the filename contains additional characters other than filename</returns>
        public static bool IsValidFilename(string fileName)
        {
            if (Path.GetFileName(fileName) != fileName)
            {
                return false;
            }

            return true;
        }
    }
}
