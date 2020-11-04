using System.Collections.Generic;
using System.Threading.Tasks;

using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Services.Interface
{
    /// <summary>
    /// Describes the public methods of a validation service
    /// </summary>
    public interface IValidation
    {
        /// <summary>
        /// Validate an instance for a specified process step.
        /// </summary>
        /// <param name="instance">The instance to validate</param>
        /// <param name="taskId">The task to validate the instance for.</param>
        /// <returns>A list of validation errors if any were found</returns>
        Task<List<ValidationIssue>> ValidateAndUpdateProcess(Instance instance, string taskId);

        /// <summary>
        /// Validate a specific data element.
        /// </summary>
        /// <param name="instance">The instance where the data element belong</param>
        /// <param name="dataType">The datatype describing the data element requirements</param>
        /// <param name="dataElement">The metadata of a data element to validate</param>
        /// <returns>A list of validation errors if any were found</returns>
        Task<List<ValidationIssue>> ValidateDataElement(Instance instance, DataType dataType, DataElement dataElement);
    }
}
