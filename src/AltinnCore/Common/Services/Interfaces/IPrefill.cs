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
        /// Prefills the data model based on the prefill json configuration file
        /// </summary>
        /// <param name="prefillContext">The prefill context</param>
        /// <param name="dataModel">The data model</param>
        /// <returns></returns>
        Task PrefillDataModel(PrefillContext prefillContext, object dataModel);
    }
}
