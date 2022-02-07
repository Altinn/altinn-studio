using System;
using System.IO;
using System.Threading.Tasks;

using Altinn.App.Services.Interface;
using Altinn.Platform.Register.Models;

using Newtonsoft.Json;

namespace App.IntegrationTests.Mocks.Services
{
    public class DSFMockSI : IDSF
    {
        public Task<Person> GetPerson(string ssn)
        {
            string personPath = GetPersonPath(ssn);
            if (File.Exists(personPath))
            {
                string content = File.ReadAllText(personPath);
                Person person = JsonConvert.DeserializeObject<Person>(content);
                return Task.FromResult(person);
            }

            return null;
        }

        private string GetPersonPath(string ssn)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(DSFMockSI).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Register\Person", ssn + ".json");
        }
    }
}
