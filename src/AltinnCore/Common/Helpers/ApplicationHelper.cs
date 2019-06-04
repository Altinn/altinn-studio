using System;
using System.Collections.Generic;
using System.Text;

namespace AltinnCore.Common.Helpers
{
    /// <summary>
    /// helper class for functionalities realted to application or application meta data
    /// </summary>
    public static class ApplicationHelper
    {
        /// <summary>
        /// Gets the application id formatted as "applicationId-applicationOwnerID"
        /// </summary>
        /// <param name="org">the application owner</param>
        /// <param name="appName">the application id</param>
        /// <returns></returns>
        public static string GetFormattedApplicationId(string org, string appName)
        {
            return $"{org}/{appName}";
        }
    }
}
