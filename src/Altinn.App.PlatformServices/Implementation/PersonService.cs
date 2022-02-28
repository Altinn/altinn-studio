#nullable enable

using System.Threading;
using System.Threading.Tasks;

using Altinn.App.PlatformServices.Interface;
using Altinn.Platform.Register.Models;

namespace Altinn.App.PlatformServices.Implementation
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
