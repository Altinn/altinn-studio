using System.Threading.Tasks;
using AltinnCore.Runtime.DataService.Models;

namespace AltinnCore.Runtime.DataService.Repository
{
    public interface IReporteeElementRepository
    {
        /// <summary>
        /// Get reportee element details for the given parameters
        /// </summary>
        /// <param name="reporteeId">the owner of the reportee element</param>
        /// <param name="reporteeElementId">the reportee element id</param>
        /// <returns>The form data for the given parameters</returns>
        Task<ReporteeElement> GetReporteeElementFromCollectionAsync(string reporteeId, string reporteeElementId);

        /// <summary>
        /// insert new reportee element into collection
        /// </summary>
        /// <param name="item">the form data</param>
        /// <returns>The reportee element inserted into collection</returns>
        Task<string> InsertReporteeElementIntoCollectionAsync(ReporteeElement item);

        /// <summary>
        /// update existing reportee element
        /// </summary>
        /// <param name="id">the id of the form</param>
        /// <param name="item">the form data</param>
        /// <returns>The updated reportee element</returns>
        Task<ReporteeElement> UpdateFormDataInCollectionAsync(string id, ReporteeElement item);
    }
}
