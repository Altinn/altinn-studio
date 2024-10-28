using System;
using System.Text.Json;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.AppScopesController.Base
{
    [Trait("Category", "DbIntegrationTest")]
    [Collection(nameof(DesignerDbCollection))]
    public abstract class DbDesignerEndpointsTestsBase<TControllerTest> : DesignerEndpointsTestsBase<TControllerTest>
        where TControllerTest : class
    {
        protected readonly DesignerDbFixture DesignerDbFixture;

        protected static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        };

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
