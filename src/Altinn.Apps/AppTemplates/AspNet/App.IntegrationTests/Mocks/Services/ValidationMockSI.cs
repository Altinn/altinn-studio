using System.Collections.Generic;
using System.Threading.Tasks;

using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;

namespace App.IntegrationTestsRef.Mocks.Services
{
    public class ValidationMockSI : IValidation
    {
        public Task<List<ValidationIssue>> ValidateAndUpdateProcess(Instance instance, string taskId)
        {
            return Task.FromResult(new List<ValidationIssue>());
        }

        public Task<List<ValidationIssue>> ValidateDataElement(Instance instance, DataType dataType, DataElement dataElement)
        {
            return Task.FromResult(new List<ValidationIssue>());
        }
    }
}
