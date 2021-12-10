using System.Threading.Tasks;

using Altinn.Platform.Authentication.Model;

namespace Altinn.Platform.Authentication.Services.Interfaces
{
    /// <summary>
    /// Interface for validating eFormidling access tokens
    /// </summary>
    public interface IEFormidlingAccessValidator
    {
        /// <summary>
        /// Validates the provided access token
        /// </summary>
        /// <param name="token">The token to validate</param>
        /// <returns>AN introspection response object</returns>
        public Task<IntrospectionResponse> ValidateToken(string token);
    }
}
