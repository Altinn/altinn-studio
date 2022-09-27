using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Pdf
{
    /// <summary>
    /// Interface for handling generation and storing of PDF's
    /// </summary>
    public interface IPdfService
    {
        /// <summary>
        /// Generates the PDF based on the current data and stores it
        /// </summary>
        /// <param name="instance">The instance the PDF is based on.</param>
        /// <param name="taskId">The task id matching the </param>
        /// <param name="dataElement">Reference to the data element.</param>
        /// <param name="dataElementModelType">Type of data referenced</param>        
        Task GenerateAndStoreReceiptPDF(Instance instance, string taskId, DataElement dataElement, Type dataElementModelType);
    }
}