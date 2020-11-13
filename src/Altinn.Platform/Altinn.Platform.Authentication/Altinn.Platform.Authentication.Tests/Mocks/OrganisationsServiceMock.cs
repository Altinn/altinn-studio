using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Authentication.Services.Interfaces;

namespace Altinn.Platform.Authentication.Tests.Mocks
{
    public class OrganisationsServiceMock : IOrganisationsService
    {
        public async Task<string> LookupOrg(string orgNumber)
        {
            switch (orgNumber)
            {
                case "991825827":
                    return "digdir";
                case "974760223":
                    return "dibk";
                default:
                    await Task.CompletedTask;
                    return null;
            }
        }
    }
}
