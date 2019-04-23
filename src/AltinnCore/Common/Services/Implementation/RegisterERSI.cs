using System;
using System.Threading.Tasks;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace AltinnCore.Common.Services.Implementation
{
    /// <inheritdoc />
    public class RegisterERSI : IER
    {
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="RegisterERSI"/> class
        /// </summary>
        /// <param name="logger">the logger</param>
        public RegisterERSI(ILogger<RegisterERSI> logger)
        {
            _logger = logger;
        }

        /// <inheritdoc />
        public Task<Organization> GetOrganization(string OrgNr)
        {
            throw new NotImplementedException();
        }
    }
}
