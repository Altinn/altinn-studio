using System.Threading.Tasks;
using Altinn.App.Services.Interface;
using Altinn.Platform.Register.Models;

namespace App.IntegrationTests.Mocks.Services
{
    public class DSFMockSI : IDSF
    {
        public Task<Person> GetPerson(string ssn)
        {
            return Task.FromResult(new Person
            {
                SSN = ssn,
            });
        }
    }
}
