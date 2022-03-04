using System.Threading.Tasks;

using Altinn.Platform.Authentication.Model;

namespace Altinn.Platform.Authentication.Services.Interfaces
{
    /// <summary>
    /// Defines the methods required for an implementation of the business logic in Platform Authentication
    /// </summary>
    public interface IAuthentication
    {
        /// <summary>
        /// Runs an introspection validation based on the provided request.
        /// </summary>
        Task<IntrospectionResponse> IntrospectionValidation(IntrospectionRequest request);
    }
}
