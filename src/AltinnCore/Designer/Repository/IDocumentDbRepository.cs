using System.Collections.Generic;
using System.Threading.Tasks;
using AltinnCore.Designer.Repository.Models;
using AltinnCore.Designer.ViewModels.Request;

namespace AltinnCore.Designer.Repository
{
    /// <summary>
    /// Interface
    /// </summary>
    public interface IDocumentDbRepository
    {
        /// <summary>
        /// Creates a item of a specific T in item db
        /// </summary>
        /// <typeparam name="T">Type of item</typeparam>
        /// <param name="item">Document</param>
        /// <returns></returns>
        Task<T> Create<T>(T item);

        /// <summary>
        /// Gets documents that matches the query
        /// </summary>
        /// <typeparam name="T">Type of item to return</typeparam>
        /// <param name="query">Query</param>
        /// <returns></returns>
        Task<IEnumerable<T>> Get<T>(DocumentQueryModel query)
            where T : DocumentBase;

        /// <summary>
        /// Updates a specific item
        /// </summary>
        /// <typeparam name="T">Type of item</typeparam>
        /// <param name="item">Document</param>
        /// <returns></returns>
        Task Update<T>(T item)
            where T : DocumentBase;
    }
}
