using System.Collections.Generic;
using System.Threading.Tasks;
using AltinnCore.Common.Models;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// This service will be handling the external JSON REST API's
    /// </summary>
    public interface IDataSourceService
    {
        /// <summary>
        /// Interface method.
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>List of Objects</returns>
        IList<DataSourceModel> GetDatasources(string org, string service, string edition);

        /// <summary>
        /// Interface method.
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="name">The name of the data source</param>
        /// <param name="url">JSON URL</param>
        /// <returns>True if save ok.</returns>
        bool Save(string org, string service, string edition, string name, string url);

        /// <summary>
        /// interface method
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="id">The data source model</param>
        /// <returns>True if delete was ok</returns>
        bool Delete(string org, string service, string edition, string id);

        /// <summary>
        /// Interface method.
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="description">Description of the rest service</param>
        /// <param name="url">JSON URL</param>
        /// <returns>JSON model</returns>
        DataSourceModel Create(string org, string service, string edition, string description, string url);

        /// <summary>
        /// Interface method.
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="model">The datasource model</param>
        void Update(string org, string service, string edition, DataSourceModel model);

        Task<string> TestRestApi(string url);
    }
}
