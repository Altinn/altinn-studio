using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

namespace Altinn.Studio.Designer.Helpers
{
    /// <summary>
    /// helper class for functionalities related to application or application meta data
    /// </summary>
    public static class ApplicationHelper
    {
        /// <summary>
        /// Gets the application id  (appId) formatted as "org/app"
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns></returns>
        public static string GetFormattedApplicationId(string org, string app)
        {
            return $"{org}/{app}";
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
