using System;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ApiTests
{
    [Trait("Category", "DbIntegrationTest")]
    [Collection(nameof(DesignerDbCollection))]
    public abstract class DbDesignerEndpointsTestsBase<TControllerTest> : DesignerEndpointsTestsBase<TControllerTest>
        where TControllerTest : class
    {
        protected readonly DesignerDbFixture DesignerDbFixture;

        protected DbDesignerEndpointsTestsBase(WebApplicationFactory<Program> factory,
            DesignerDbFixture designerDbFixture) : base(factory)
        {
            DesignerDbFixture = designerDbFixture;
        }

        protected override string JsonConfigOverride =>
            $@"
              {{
                    ""OidcLoginSettings"": {{
                        ""ClientId"": ""{Guid.NewGuid()}"",
                        ""ClientSecret"": ""{Guid.NewGuid()}"",
                        ""Authority"": ""http://studio.localhost/repos/"",
                        ""Scopes"": [
                            ""openid"",
                            ""profile"",
                            ""write:activitypub"",
                            ""write:admin"",
                            ""write:issue"",
                            ""write:misc"",
                            ""write:notification"",
                            ""write:organization"",
                            ""write:package"",
                            ""write:repository"",
                            ""write:user""
                        ],
                        ""RequireHttpsMetadata"": false,
                        ""CookieExpiryTimeInMinutes"" : 59
                    }},
                    ""PostgreSQLSettings"": {{
                        ""ConnectionString"": ""{DesignerDbFixture.ConnectionString}"",
                        ""DesignerDbPwd"": """"
                    }}
             }}
            ";

    }
}
