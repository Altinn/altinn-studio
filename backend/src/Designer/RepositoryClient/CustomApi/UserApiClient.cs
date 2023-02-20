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
    [Obsolete("Not in use")]
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
        public async Task<Model.User> GetCurrentUser(string giteaSession)
        {
            Model.User user;
            DataContractJsonSerializer serializer = new (typeof(Model.User));

            Uri giteaUrl = new ("http://studio.localhost:3000/api/v1/user");
            Cookie cookie = new (giteaCoookieId, giteaSession, "/", "studio.localhost");
            CookieContainer cookieContainer = new ();
            cookieContainer.Add(cookie);
            HttpClientHandler handler = new () { CookieContainer = cookieContainer };
            using (HttpClient client = new (handler))
            {
                var streamTask = client.GetStreamAsync(giteaUrl);
                user = serializer.ReadObject(await streamTask) as Model.User;
            }

            return user;
        }
    }
}
