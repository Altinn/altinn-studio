using System.Threading.Tasks;

namespace Altinn.Platform.Authorization.Functions.Services.Interfaces
{
    public interface IAccessTokenProvider
    {
        public Task<string> GetAccessToken();
    }
}
