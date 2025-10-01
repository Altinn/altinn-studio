#nullable enable
using Altinn.Platform.Register.Models;
using LocalTest.Services.Register.Interface;
using LocalTest.Services.TestData;

namespace LocalTest.Services.Register.Implementation
{
    /// <summary>
    /// The persons wrapper
    /// </summary>
    public class PersonsWrapper : IPersons
    {
        private readonly TestDataService _testDataService;

        public PersonsWrapper(TestDataService testDataService)
        {
            _testDataService = testDataService;
        }

        /// <inheritdoc />
        public async Task<Person?> GetPerson(string ssn)
        {
            var data = await _testDataService.GetTestData();
            return data.Register.Person.TryGetValue(ssn, out var value) ? value : null;
        }
    }
}
