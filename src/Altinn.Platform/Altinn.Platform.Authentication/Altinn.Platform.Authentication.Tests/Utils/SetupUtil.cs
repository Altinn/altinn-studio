using System.Net.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace App.IntegrationTests.Utils
{
    public static class SetupUtil
    {
        public static void AddAuthCookie(HttpRequestMessage requestMessage, string token)
        {
            requestMessage.Headers.Add("Cookie", "AltinnStudioRuntime" + "=" + token);
        }
    }
}
