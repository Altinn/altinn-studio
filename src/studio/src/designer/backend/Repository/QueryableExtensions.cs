using System;
using System.Linq;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Request.Enums;

namespace Altinn.Studio.Designer.Repository
{
    /// <summary>
    /// Contains extension methods for IQueryable of T
    /// </summary>
    public static class QueryableExtensions
    {
        /// <summary>
        /// Extension method to go through query params and add them to the IQueryable
        /// </summary>
        /// <typeparam name="T">Type of IQueryable</typeparam>
        /// <param name="q">The Queryable</param>
        /// <param name="query">The query model</param>
        /// <returns></returns>
        public static IQueryable<T> BuildQuery<T>(this IQueryable<T> q, DocumentQueryModel query)
            where T : BaseEntity
        {
            if (!string.IsNullOrWhiteSpace(query.SortBy) &&
                query.SortBy.Equals("created", StringComparison.OrdinalIgnoreCase))
            {
                IOrderedQueryable<T> orderBy = q.OrderByDescending(x => x.Created);

                if (query.SortDirection == SortDirection.Ascending)
                {
                    orderBy = q.OrderBy(x => x.Created);
                }

                q = orderBy;
            }

            if (!string.IsNullOrWhiteSpace(query.Org))
            {
                q = q.Where(x => x.Org == query.Org);
            }

            if (!string.IsNullOrWhiteSpace(query.App))
            {
                q = q.Where(x => x.App == query.App);
            }

            return q;
        }
    }
}
