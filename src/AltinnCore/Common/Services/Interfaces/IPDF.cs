using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.ServiceLibrary.Models;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// The pdf service
    /// </summary>
    public interface IPDF
    {
        /// <summary>
        /// Generates a pdf receipt
        /// </summary>
        Task GenerateAndStoreReceiptPDF(Instance instance, UserContext userContext);
    }
}
