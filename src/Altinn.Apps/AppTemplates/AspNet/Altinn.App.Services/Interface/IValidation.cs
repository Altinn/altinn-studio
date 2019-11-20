using Altinn.App.Services.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.App.Services.Interface
{
    public interface IValidation
    {

        Task<List<ValidationIssue>> ValidateAndUpdateInstance(string org, string app, int instanceOwnerPartyId, Guid instanceId, Instance instance, string taskId);

    }
}
