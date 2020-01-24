using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.ViewModels.Request;
using Microsoft.Azure.Documents;

namespace Altinn.Studio.Designer.Repository
{
    /// <summary>
    /// Interface
    /// </summary>
    public interface IDocumentRepository
    {
        /// <summary>
        /// Creates a item of a specific T in item db
        /// </summary>
        /// <typeparam name="T">Type of item</typeparam>
        /// <param name="item">Document</param>
        /// <returns></returns>
        Task<T> CreateAsync<T>(T item);

        /// <summary>
        /// Gets documents that matches the query
        /// </summary>
        /// <typeparam name="T">Type of item to return</typeparam>
        /// <param name="query">Query</param>
        /// <returns></returns>
        Task<IEnumerable<T>> GetAsync<T>(DocumentQueryModel query)
            where T : BaseEntity;

        /// <summary>
        /// Get one document specified by id
        /// </summary>
        /// <typeparam name="T">Type of item to return</typeparam>
        /// <param name="id">string</param>
        /// <returns></returns>
        Task<T> GetAsync<T>(string id)
            where T : BaseEntity;

        /// <summary>
        /// Gets documents based on an sql query
        /// </summary>
        /// <typeparam name="T">Type of item to return</typeparam>
        /// <returns></returns>
        Task<IEnumerable<T>> GetWithSqlAsync<T>(SqlQuerySpec sqlQuerySpec)
            where T : BaseEntity;

        /// <summary>
        /// Updates a specific item
        /// </summary>
        /// <typeparam name="T">Type of item</typeparam>
        /// <param name="item">Document</param>
        /// <returns></returns>
        Task UpdateAsync<T>(T item)
            where T : BaseEntity;
    }
}
