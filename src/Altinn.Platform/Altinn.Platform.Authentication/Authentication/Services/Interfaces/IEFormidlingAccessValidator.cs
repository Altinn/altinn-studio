using System.Threading.Tasks;

using Altinn.Platform.Authentication.Model;

namespace Altinn.Platform.Authentication.Services.Interfaces
{
    /// <summary>
    /// Defines the methods required for an implementation of an eformidling access validator.
    /// </summary>
    public interface IEFormidlingAccessValidator
    {
        /// <summary>
        /// Validates the provided access token
        /// </summary>
        /// <param name="token">The token to validate</param>
        /// <returns>An introspection response object</returns>
        public Task<IntrospectionResponse> ValidateToken(string token);
    }
}
