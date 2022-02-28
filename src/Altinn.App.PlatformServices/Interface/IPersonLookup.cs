﻿#nullable enable

using System.Threading;
using System.Threading.Tasks;

using Altinn.Platform.Register.Models;

namespace Altinn.App.PlatformServices.Interface
{
    /// <summary>
    /// Describes the methods required by a person lookup service.
    /// </summary>
    public interface IPersonLookup
    {
        /// <summary>
        /// Get the <see cref="Person"/> object for the person identified with the parameters.
        /// </summary>
        /// <remarks>
        /// The method requires both the national identity number and the last name of the person. This is used to 
        /// verify that entered information is correct and to prevent testing of random identity numbers.
        /// </remarks>
        /// <param name="nationalIdentityNumber">The national identity number of the person.</param>
        /// <param name="lastName">The last name of the person.</param>
        /// <param name="ct">The cancellation token to cancel operation.</param>
        /// <returns>The identified person if found.</returns>
        Task<Person?> GetPerson(string nationalIdentityNumber, string lastName, CancellationToken ct);
    }
}
