using System;
using System.Linq;
using AltinnCore.Designer.Repository.Models;
using AltinnCore.Designer.TypedHttpClients.Models;
using Microsoft.Azure.Documents.Linq;

namespace AltinnCore.Designer.Repository
{
    /// <summary>
    /// a
    /// </summary>
    public static class IOrderedQueryableExtensions
    {
        /// <summary>
        /// Extension method to go through query params and add them to the IQueryable
        /// </summary>
        /// <typeparam name="T">Type of IQueryable</typeparam>
        /// <param name="q">The Queryable</param>
        /// <param name="query">The query model</param>
        /// <returns></returns>
        public static IQueryable<T> BuildQuery<T>(this IQueryable<T> q, DocumentQueryModel query)
            where T : DocumentBase
        {
            if (!string.IsNullOrWhiteSpace(query.OrderBy) &&
                query.OrderBy.Equals("created", StringComparison.OrdinalIgnoreCase))
            {
                var orderBy = q.OrderByDescending(x => x.Created);

                if (!string.IsNullOrWhiteSpace(query.SortOrder) &&
                    query.SortOrder.Equals("asc", StringComparison.OrdinalIgnoreCase))
                {
                    orderBy = q.OrderBy(x => x.Created);
                }

                q = orderBy;
            }

            return q;
        }
    }
}
