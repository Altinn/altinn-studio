using System.Threading.Tasks;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Newtonsoft.Json.Linq;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// The prefill service 
    /// </summary>
    public interface IPrefill
    {
        /// <summary>
        /// Prefills the data model based on the json configuration file
        /// </summary>
        /// <param name="jsonConfig">The json configuration</param>
        /// <param name="register">The register service</param>
        /// <param name="profile">The profile service</param>
        /// <param name="prefillContext">The prefill context</param>
        /// <param name="serviceModel">The service model</param>
        /// <returns></returns>
        Task PrefillDataModel(string jsonConfig, IRegister register, IProfile profile, PrefillContext prefillContext, object serviceModel);

    }
}
