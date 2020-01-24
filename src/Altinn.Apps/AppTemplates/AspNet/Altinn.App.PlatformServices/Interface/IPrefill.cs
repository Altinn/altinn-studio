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
        /// <param name="ssn">The ssn, is null if prefilling for an organization</param>
        /// <param name="orgNumber">The orgNumber, is null if prefilling for a person</param>
        /// <param name="dataModel">The data model</param>
        /// <returns></returns>
        Task PrefillDataModel(string ssn, string orgNumber, object dataModel);
    }
}
