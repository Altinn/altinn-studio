using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace App.IntegrationTestsRef.Mocks.Services
{
    public class ValidationMockSI : IValidation
    {
        public async Task<List<ValidationIssue>> ValidateAndUpdateProcess(Instance instance, string taskId)
        {
            return new List<ValidationIssue>();
        }

        public async Task<List<ValidationIssue>> ValidateDataElement(Instance instance, DataType dataType, DataElement dataElement)
        {
            return new List<ValidationIssue>();
        }
    }
}
