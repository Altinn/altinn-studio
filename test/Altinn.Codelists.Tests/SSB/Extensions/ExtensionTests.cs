using Altinn.Codelists.SSB;
using Altinn.Codelists.SSB.Extensions;
using Altinn.Codelists.SSB.Models;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.Codelists.Tests.SSB.Extensions
{
    public class ExtensionTests
    {
        [Fact]
        public void AddSSBClassifications()
        {
            IServiceCollection services = new ServiceCollection();
            services.AddSSBClassificationCodelistProvider("sivilstand", Classification.MaritalStatus);
            services.AddSSBClassificationCodelistProvider("yrker", Classification.Occupations);
            
            IServiceProvider serviceProvider = services.BuildServiceProvider();

            IEnumerable<IClassificationsClient> classificationsClients = serviceProvider.GetServices<IClassificationsClient>();

            classificationsClients.Should().HaveCount(1);
        }
    }
}
