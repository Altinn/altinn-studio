using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace AltinnCore.ServiceLibrary
{
    /// <summary>
    /// Interface describing the services exposed by the platform
    /// </summary>
    public interface IPlatformServices
    {
        /// <summary>
        /// Gets the available reportees for a given user (identified by <paramref name="userID"/>)
        /// </summary>
        /// <param name="userID">The id of the user to get the reportee list for</param>
        /// <returns>A list of reportees that the given user has access to</returns>
        List<Reportee> GetReporteeList(int userID);

        /// <summary>
        /// Gets contents of a code list in a format which can be used in asp .net tag helpers for dropdowns
        /// </summary> 
        /// <param name="name">The name of the code list</param>
        /// <param name="textKey">The key of the code list value to use as the display text</param>
        /// <param name="valueKey">The key of the code list value to use as the item value</param>
        /// <param name="codelistSource">
        /// Where to get the code list from, if not set the following search order will be used:
        /// 1. Service edition
        /// 2. Service
        /// 3. Service owner
        /// </param>
        /// <returns>A list which can be used for populating dropdowns etc. using tag helpers</returns>
        List<SelectListItem> GetPresentationCodelist(string name, string textKey, string valueKey, CodeListSourceType codelistSource = CodeListSourceType.Unspecified);

        /// <summary>
        /// Gets the contents of a code list
        /// </summary>
        /// <param name="name">The name of the code list to get</param>
        /// <param name="codelistSource">
        /// Where to get the code list from, if not set the following search order will be used:
        /// 1. Service edition
        /// 2. Service
        /// 3. Service owner
        /// </param>
        /// <returns>The requested code list if found</returns>
        string GetCodelist(string name, CodeListSourceType codelistSource = CodeListSourceType.Unspecified);
    }
}
