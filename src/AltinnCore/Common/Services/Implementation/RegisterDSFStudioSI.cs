using System;
using System.Threading.Tasks;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace AltinnCore.Common.Services.Implementation
{
    /// <inheritdoc />
    public class RegisterDSFStudioSI : IDSF
    {
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="RegisterDSFStudioSI"/> class
        /// </summary>
        /// <param name="logger">the logger</param>
        public RegisterDSFStudioSI(ILogger<RegisterDSFStudioSI> logger)
        {
            _logger = logger;
        }

        /// <inheritdoc />
        public Task<Person> GetPerson(string SSN)
        {
            throw new NotImplementedException();
        }
    }
}
