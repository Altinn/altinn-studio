using AltinnCore.ServiceLibrary;
using AltinnCore.ServiceLibrary.ServiceMetadata;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for the execution service needed for running AltinnCore services
    /// </summary>
    public interface IExecution
    {
        /// <summary>
        /// Returns the ServiceImplementation for a service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>The service implementation</returns>
        IServiceImplementation GetServiceImplementation(string org, string service, string edition);

        /// <summary>
        /// Returns the serviceContext
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>The serviceContext</returns>
        ServiceContext GetServiceContext(string org, string service, string edition);

        /// <summary>
        /// Returns a new instanceId for a service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>The instanceId</returns>
        int GetNewServiceInstanceID(string org, string service, string edition);

        /// <summary>
        /// Gets the raw content of a code list
        /// </summary>
        /// <param name="org">The organization code of the service owner</param>
        /// <param name="service">The service code of the current service</param>
        /// <param name="edition">The edition code of the current service</param>
        /// <param name="name">The name of the code list to retrieve</param>
        /// <returns>Raw contents of a code list file</returns>
        string GetCodelist(string org, string service, string edition, string name);

        /// <summary>
        /// 
        /// </summary>
        /// <param name="org"></param>
        /// <param name="service"></param>
        /// <param name="edition"></param>
        /// <param name="resource"></param>
        /// <returns></returns>
        byte[] GetServiceResource(string org, string service, string edition, string resource);

        /// <summary>
        /// Returns the service metadata for a service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <returns>The service metadata for a service</returns>
        ServiceMetadata GetServiceMetaData(string org, string service, string edition);
    }
}
