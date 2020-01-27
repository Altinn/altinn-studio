using System.Threading.Tasks;
using Altinn.App.Services.Models;

namespace Altinn.App.Services.Interface
{
    /// <summary>
    /// The prefill service
    /// </summary>
    public interface IPrefill
    {
        /// <summary>
        /// Prefills the data model based on the prefill json configuration file
        /// </summary>
        /// <param name="partyId">The partyId of the instance owner</param>
        /// <param name="dataModel">The data model</param>
        /// <returns></returns>
        Task PrefillDataModel(string partyId, object dataModel);
    }
}
