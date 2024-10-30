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
            JsonConfigOverrides.Add($@"
              {{
                    ""PostgreSQLSettings"": {{
                        ""ConnectionString"": ""{DesignerDbFixture.ConnectionString}"",
                        ""DesignerDbPwd"": """"
                    }}
             }}
            ");
        }

    }
}
