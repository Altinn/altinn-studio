using System;
using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Register.Models;
using LocalTest.Configuration;
using LocalTest.Services.Register.Interface;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace LocalTest.Services.Register.Implementation
{
    /// <summary>
    /// The persons wrapper
    /// </summary>
    public class PersonsWrapper : IPersons
    {
        private readonly LocalPlatformSettings _localPlatformSettings;

        public PersonsWrapper(IOptions<LocalPlatformSettings> localPlatformSettings)
        {
            _localPlatformSettings = localPlatformSettings.Value;
        }

        /// <inheritdoc />
        public async Task<Person> GetPerson(string ssn)
        {
            Person person = null;
            string path = this._localPlatformSettings.LocalTestingStaticTestDataPath + "Register/Person/" + ssn + ".json";
            if (File.Exists(path))
            {
                string content = File.ReadAllText(path);
                person = (Person)JsonConvert.DeserializeObject(content, typeof(Person));
            }

            return await Task.FromResult(person);
        }
    }
}
