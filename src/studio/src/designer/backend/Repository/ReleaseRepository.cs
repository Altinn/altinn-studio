using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.Models;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Microsoft.Azure.Documents;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Repository
{
    /// <summary>
    /// ReleaseRepository
    /// </summary>
    public class ReleaseRepository : DocumentRepository
    {
        /// <summary>
        /// Constructor
        /// </summary>
        public ReleaseRepository(
            IOptions<AzureCosmosDbSettings> options,
            IDocumentClient documentClient)
            : base(options.Value.ReleaseCollection, options, documentClient)
        {
        }

        /// <summary>
        /// Gets the succeeded release
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">App</param>
        /// <param name="tagName">Tag name</param>
        /// <returns></returns>
        public async Task<ReleaseEntity> GetSucceededReleaseFromDb(string org, string app, string tagName)
        {
            SqlQuerySpec sqlQuerySpec = CreateSqlQueryToGetSucceededRelease(org, app, tagName);
            IEnumerable<ReleaseEntity> releases = await GetWithSqlAsync<ReleaseEntity>(sqlQuerySpec);
            return releases.Single();
        }

        private static SqlQuerySpec CreateSqlQueryToGetSucceededRelease(string org, string app, string tagName)
            => new SqlQuerySpec
            {
                QueryText = $"SELECT * FROM db WHERE " +
                            $"db.app = @app AND " +
                            $"db.org = @org AND " +
                            $"db.tagName = @tagName AND " +
                            $"db.build.result = '{BuildResult.Succeeded.ToEnumMemberAttributeValue()}'",
                Parameters = new SqlParameterCollection
                {
                    new SqlParameter("@org", org),
                    new SqlParameter("@app", app),
                    new SqlParameter("@tagName", tagName),
                }
            };
    }
}
