using System.Threading.Tasks;
using Altinn.App.Services.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Services.Interface
{
    /// <summary>
    /// The pdf service
    /// </summary>
    public interface IPDF
    {
        /// <summary>
        /// Generates a pdf receipt for a given dataElement
        /// </summary>
        Task GenerateAndStoreReceiptPDF(Instance instance, DataElement dataElement);
    }
}
