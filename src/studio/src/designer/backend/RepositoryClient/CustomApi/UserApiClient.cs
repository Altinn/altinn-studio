using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.Studio.Designer.RepositoryClient.CustomApi
{
    /// <summary>
    /// client for user api
    /// </summary>
    public class UserApiClient
    {
        private readonly string giteaCoookieId = "i_like_gitea";

        /// <summary>
        /// Initializes a new instance of the <see cref="UserApiClient"/> class
        /// </summary>
        public UserApiClient()
        {
        }

        /// <summary>
        /// Get current user
        /// </summary>
        /// <param name="giteaSession">the gitea session</param>
        /// <returns>The current user</returns>
        public async Task<Altinn.Studio.Designer.RepositoryClient.Model.User> GetCurrentUser(string giteaSession)
        {
            Altinn.Studio.Designer.RepositoryClient.Model.User user;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Altinn.Studio.Designer.RepositoryClient.Model.User));

            Uri giteaUrl = new Uri("http://local.altinn.studio:3000/api/v1/user");
            Cookie cookie = new Cookie(giteaCoookieId, giteaSession, "/", "local.altinn.studio");
            CookieContainer cookieContainer = new CookieContainer();
            cookieContainer.Add(cookie);
            HttpClientHandler handler = new HttpClientHandler() { CookieContainer = cookieContainer };
            using (HttpClient client = new HttpClient(handler))
            {
                var streamTask = client.GetStreamAsync(giteaUrl);
                user = serializer.ReadObject(await streamTask) as Altinn.Studio.Designer.RepositoryClient.Model.User;
            }

            return user;
        }
    }
}
