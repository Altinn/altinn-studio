using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Platform.Storage.Helpers
{
    /// <summary>
    /// helper class for functionalities related to application
    /// </summary>
    public static class ApplicationHelper
    {
        /// <summary>
        /// Gets the application owner from the applicationid
        /// </summary>
        /// <param name="applicationId">the application id formatted as "applicationownerid-applicationid"</param>
        /// <returns>the application owner id</returns>
        public static string GetApplicationOwner(string applicationId)
        {
            if (applicationId == null || applicationId.Contains("/"))
            {
                throw new ApplicationException("ApplicationId cannot be null or contain forward slash /");
            }

            string[] parts = applicationId.Split("-");

            if (parts.Length > 1)
            {
                return parts[0];
            }

            throw new ApplicationException("Cannot get application Owner Id from applicationId: {applicationId}");
        }
    }
}
