using System.Threading.Tasks;

namespace AltinnCore.Designer.TypedHttpClients.Altinn
{
    /// <summary>
    /// Platform Authorization service interface
    /// </summary>
    public interface IPlatformAuthorizationService
    {
        /// <summary>
        /// Saves a policy
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Aoo</param>
        /// <param name="policy">Policy to save</param>
        /// <returns></returns>
        Task SavePolicy(string org, string app, string policy);
    }
}
