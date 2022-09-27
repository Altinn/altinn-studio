#nullable enable

using Altinn.App.Core.Interface;
using Altinn.Platform.Register.Models;

namespace Altinn.App.Core.Implementation
{
    /// <summary>
    /// Represents a collection of business logic operation related to persons.
    /// </summary>
    public class PersonService : IPersonLookup
    {
        private readonly IPersonRetriever _personRetriever;

        /// <summary>
        /// Initializes a new instance of the <see cref="PersonService"/> class.
        /// </summary>
        /// <param name="personRetriever">An implementation of <see cref="IPersonRetriever"/> able to obtain a <see cref="Person"/>.</param>
        public PersonService(IPersonRetriever personRetriever)
        {
            _personRetriever = personRetriever;
        }

        /// <inheritdoc/>
        public Task<Person?> GetPerson(string nationalIdentityNumber, string lastName, CancellationToken ct)
        {
            return _personRetriever.GetPerson(nationalIdentityNumber, lastName, ct);
        }
    }
}
