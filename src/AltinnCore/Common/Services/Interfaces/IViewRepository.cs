using System.Collections.Generic;
using AltinnCore.ServiceLibrary.ServiceMetadata;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// The ViewRepository interface.
    /// </summary>
    public interface IViewRepository
    {
        /// <summary>
        /// Create and save ViewMetadata.
        /// Will also create text resource with the view name.
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="view">The view meta data</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        bool CreateView(string org, string service, string edition, ViewMetadata view);

        /// <summary>
        /// The get all ViewMetadata objects for service edition.
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>  The list of <see cref="ViewMetadata" />. </returns>
        IList<ViewMetadata> GetViews(string org, string service, string edition);

        /// <summary>
        /// Change/Update the name of a view
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="currentName">The current name of the view</param>
        /// <param name="newName">The new name of the View</param>
        /// <returns>Returns true or false, if update/change was successfully.</returns>
        bool UpdateViewName(string org, string service, string edition, string currentName, string newName);

        /// <summary>
        /// Get the content of the RazorView
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="name">The RazorView name</param>
        /// <returns>The content of the RazorView (html/razor)</returns>
        string GetView(string org, string service, string edition, string name);

        /// <summary>
        /// Method that deletes a view from disk
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="name">The name on config</param>
        /// <returns>True if success, false otherwise</returns>
        bool DeleteView(string org, string service, string edition, string name);

        /// <summary>
        /// Save the content of the Razor View
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="name">The name of the RazorView</param>
        /// <param name="html">The content of the RazorView</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        bool SaveView(string org, string service, string edition, string name, string html);

        /// <summary>
        /// The rearrange views.
        /// </summary>
        /// <param name="org">
        /// The org.
        /// </param>
        /// <param name="service">
        /// The service.
        /// </param>
        /// <param name="edition">
        /// The edition.
        /// </param>
        /// <param name="newViewOrder">
        /// The new view order. List containing the old index of the views.
        /// </param>
        void RearrangeViews(string org, string service, string edition, int[] newViewOrder);
    }
}