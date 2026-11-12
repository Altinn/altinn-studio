using System;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Common.Cdn;
using Altinn.Studio.Common.Domain;
using Xunit;

namespace Altinn.Studio.Common.Tests.Cdn;

// Altinn.Studio.Common has an Assert of its own, which the enclosing namespace would find first.
using Assert = Xunit.Assert;

public sealed class AltinnOrgsRegistryTests
{
    // The shape of https://altinncdn.no/orgs/altinn-orgs.json, with the fields the registry does not read.
    private const string Document = """
        {
          "orgs": {
            "ttd": {
              "name": { "en": "Test Ministry", "nb": "Testdepartementet", "nn": "Testdepartementet" },
              "logo": "https://altinncdn.no/orgs/ttd/ttd.png",
              "orgnr": "405003309",
              "homepage": "https://www.digdir.no",
              "environments": ["at22", "tt02", "production"]
            },
            "ssb": { "name": { "en": "Statistics Norway" }, "orgnr": "971526920", "environments": ["tt02"] },
            "dibk": { "name": { "en": "Norwegian Building Authority" }, "orgnr": "", "environments": [] },
            "old": { "name": { "en": "Without the field" } },
            "odd": { "environments": ["tt02", "moon", 7, null] },
            "not a name": { "environments": ["tt02"] },
            "Upper": { "environments": ["tt02"] }
          }
        }
        """;

    [Fact]
    public void TryParse_ReadsEachServiceOwnerWithItsEnvironments()
    {
        AltinnOrgsRegistry registry = Parse(Document);

        Assert.Equal(
            ["dibk", "odd", "old", "ssb", "ttd"],
            registry.ServiceOwners.Select(o => o.Code.Value).Order(StringComparer.Ordinal)
        );
        ServiceOwner ttd = Find(registry, "ttd");
        Assert.Equal(["at22", "prod", "tt02"], ttd.Environments.Select(e => e.Name).Order(StringComparer.Ordinal));
        Assert.True(ttd.Has(RuntimeEnvironment.Production));
        Assert.True(ttd.Has(RuntimeEnvironment.TT02));
        Assert.Equal("ttd", ttd.ToString());
    }

    [Fact]
    public void TryParse_LeavesOutWhatIsNotAnEnvironmentOrAServiceOwnerCode()
    {
        AltinnOrgsRegistry registry = Parse(Document);

        Assert.Equal(["not a name", "Upper"], registry.Skipped);
        Assert.Equal(
            [("odd", "moon"), ("odd", "7"), ("odd", "null")],
            registry.UnknownEnvironments.Select(e => (e.Code.Value, e.Name))
        );
        Assert.Equal([RuntimeEnvironment.TT02], Find(registry, "odd").Environments);
        Assert.Empty(Find(registry, "dibk").Environments);
        Assert.Empty(Find(registry, "old").Environments);
        Assert.False(Find(registry, "ssb").Has(RuntimeEnvironment.Production));
    }

    [Fact]
    public async Task Find_GivesOnlyServiceOwnersTheDocumentHas()
    {
        ServiceOwnerRegistry registry = Parse(Document);

        Assert.NotNull(await registry.Find(ServiceOwnerCode.Parse("ssb"), TestContext.Current.CancellationToken));
        Assert.Null(await registry.Find(ServiceOwnerCode.Parse("skd"), TestContext.Current.CancellationToken));
        Assert.Equal(5, (await registry.List(TestContext.Current.CancellationToken)).Count);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not json")]
    [InlineData("[]")]
    [InlineData("{}")]
    [InlineData("{\"orgs\": []}")]
    [InlineData("{\"orgs\": {\"ttd\": {\"environments\": [\"tt02\"")]
    public void TryParse_RefusesWhatIsNotTheDocument(string json)
    {
        Assert.False(AltinnOrgsRegistry.TryParse(Encoding.UTF8.GetBytes(json), out AltinnOrgsRegistry? registry));
        Assert.Null(registry);
    }

    [Fact]
    public void TryParse_AcceptsADocumentWithoutServiceOwners()
    {
        AltinnOrgsRegistry registry = Parse("{\"orgs\": {}}");

        Assert.Empty(registry.ServiceOwners);
        Assert.Empty(registry.Skipped);
    }

    [Fact]
    public void Environments_CannotBeChanged()
    {
        ServiceOwner odd = Find(Parse(Document), "odd");

        Assert.IsNotType<System.Collections.Generic.HashSet<RuntimeEnvironment>>(odd.Environments, exactMatch: false);
        Assert.True(
            Assert
                .IsType<System.Collections.Generic.ICollection<RuntimeEnvironment>>(odd.Environments, exactMatch: false)
                .IsReadOnly
        );
    }

    [Fact]
    public void Registered_RefusesADefaultValue()
    {
        Assert.Throws<InvalidOperationException>(() => TestRegistry.Create(default, []));
        Assert.Throws<InvalidOperationException>(() => TestRegistry.Create(ServiceOwnerCode.Parse("ttd"), [default]));
        Assert.Equal("ttd", TestRegistry.Create(ServiceOwnerCode.Parse("ttd"), [RuntimeEnvironment.TT02]).ToString());
    }

    private abstract class TestRegistry : ServiceOwnerRegistry
    {
        public static ServiceOwner Create(ServiceOwnerCode code, RuntimeEnvironment[] environments) =>
            Registered(code, environments);
    }

    private static ServiceOwner Find(AltinnOrgsRegistry registry, string name)
    {
        Assert.True(registry.TryFind(ServiceOwnerCode.Parse(name), out ServiceOwner? serviceOwner));
        return serviceOwner;
    }

    private static AltinnOrgsRegistry Parse(string json)
    {
        Assert.True(AltinnOrgsRegistry.TryParse(Encoding.UTF8.GetBytes(json), out AltinnOrgsRegistry? registry));
        return registry;
    }
}
