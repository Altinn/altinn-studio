using System.Collections.Generic;
using AltinnCore.ServiceLibrary;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for authorization functionality
    /// </summary>
    public interface IAuthorization
    {
        /// <summary>
        /// Returns the list of parties that user has any rights for
        /// </summary>
        /// <param name="userID">The userID</param>
        /// <returns>List of parties</returns>
        List<Reportee> GetReporteeList(int userID);
    }
}
