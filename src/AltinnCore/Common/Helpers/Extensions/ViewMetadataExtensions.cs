using System;
using System.Collections.Generic;
using System.Linq;

namespace AltinnCore.Common.Helpers.Extensions
{
    using AltinnCore.ServiceLibrary.ServiceMetadata;

    /// <summary>
    /// The view metadata extensions.
    /// </summary>
    public static class ViewMetadataExtensions
    {
        /// <summary>
        /// The get default view name.
        /// </summary>
        /// <param name="viewMetadatas"> The view metadata list. </param>
        /// <param name="viewName"> The view name. </param>
        /// <returns> The <see cref="string"/>. </returns>
        public static string GetDefaultRazerViewName(this IEnumerable<ViewMetadata> viewMetadatas, string viewName)
        {
            if (viewMetadatas == null)
            {
                return string.Empty;
            }

            var namedViews = viewMetadatas.Where(v => !string.IsNullOrEmpty(v?.Name)).ToList();
            var selected = namedViews.FirstOrDefault(v => v.Name.Equals(viewName, StringComparison.CurrentCultureIgnoreCase))
               ?? namedViews.FirstOrDefault();
            var result = selected != null ? selected.Name + "final" : string.Empty;
            return result;
        }

        /// <summary>
        /// Filter list of view meta by name. Case insensitive.
        /// </summary>
        /// <param name="viewMetadatas"> The view metadata. </param>
        /// <param name="viewName"> The view name. </param>
        /// <returns> The list of view metadata with the same name as viewName. </returns>
        public static IEnumerable<ViewMetadata> FilterByName(this IEnumerable<ViewMetadata> viewMetadatas, string viewName)
        {
            Guard.AssertArgumentNotNullOrWhiteSpace(viewName, nameof(viewName));
            if (viewMetadatas == null)
            {
                return new ViewMetadata[0];
            }

            return viewMetadatas.Where(v => viewName.Equals(v?.Name, StringComparison.CurrentCultureIgnoreCase));
        }

        /// <summary>
        /// The rearrange.
        /// </summary>
        /// <param name="viewMetadatas">
        /// The view metadata list. Ordered list, in the existing persisted order.
        /// </param>
        /// <param name="newOrder">
        /// The new order. A ordered list, where each item is the position in the old view list where.
        /// </param>
        /// <returns>
        /// A new instance of list, with the same view metadata items rearranged.
        /// </returns>
        /// <exception cref="ArgumentException">
        /// Nulls, different collection lengths, or index duplication or out of range.
        /// </exception>
        public static IList<ViewMetadata> Rearrange(this IList<ViewMetadata> viewMetadatas, int[] newOrder)
        {
            Guard.AssertArgumentNotNull(viewMetadatas, nameof(viewMetadatas));
            Guard.AssertArgumentNotNull(newOrder, nameof(newOrder));
            if (newOrder.Length != viewMetadatas.Count)
            {
                throw new ArgumentException("Collection sizes does not match.", nameof(newOrder));
            }

            // Gjør om til map, så jeg kan hente ut indexer uten å ødelegge resten av rekkefølgen.
            var map = new Dictionary<int, ViewMetadata>();
            for (var i = 0; i < viewMetadatas.Count; i++)
            {
                map.Add(i, viewMetadatas[i]);
            }

            var result = new List<ViewMetadata>(newOrder.Length);
            foreach (var key in newOrder)
            {
                if (map.TryGetValue(key, out ViewMetadata tmp) && map.Remove(key))
                {
                    result.Add(tmp);
                }
                else
                {
                    throw new ArgumentException("Contains indexes out of bounds.", nameof(newOrder));
                }
            }

            return result;
        }
    }
}
