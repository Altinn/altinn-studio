using System;
using System.Collections.Generic;
using System.Linq;
using AltinnCore.ServiceLibrary.ServiceMetadata;

namespace AltinnCore.ServiceLibrary.Extensions
{
    /// <summary>
    /// Extension for ServiceMetadata
    /// </summary>
    public static class ServiceMetadataExtensions
    {
        /// <summary>
        /// Case incentive search for views.
        /// Should return 0 or 1 views.
        /// </summary>
        /// <param name="viewMetadatas">The list of ViewMetadata objects.</param>
        /// <param name="viewName">the view name</param>
        /// <returns>Returns a search result</returns>
        public static IEnumerable<ViewMetadata> GetViews(this IEnumerable<ViewMetadata> viewMetadatas,
            string viewName)
        {
            if (viewMetadatas == null || string.IsNullOrEmpty(viewName))
            {
                return new List<ViewMetadata>();
            }

            return
                viewMetadatas
                    .Where(v => viewName.Equals(v?.Name, StringComparison.CurrentCultureIgnoreCase))
                    .ToList();
        }
    }
}
