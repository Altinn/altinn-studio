using Altinn.Studio.StudioctlServer.Discovery.Container;

namespace Studioctl.Tests.Discovery;

public sealed class ContainerDiscoveryTests
{
    /// <summary>
    /// A container on the localtest-v2 network carries the front door's address of it; discovery still probes it on
    /// its loopback port.
    /// </summary>
    [Fact]
    public void ACandidateCarriesTheFrontDoorsAddressOfAContainerOnTheLocaltestV2Network()
    {
        var candidates = ContainerDiscovery.ToDiscoveryCandidates(
            ContainerDiscovery.Parse(
                """
                [
                  {"containerId":"a","name":"localtest-app-one","description":"container one","source":"container","hostPort":5005,"frontDoorUrl":"http://ttd-one:5005"},
                  {"containerId":"b","name":"localtest-app-two","description":"container two","source":"container","hostPort":5006},
                  {"containerId":"c","name":"localtest-app-three","description":"container three","source":"container","hostPort":5007,"frontDoorUrl":"not a url"}
                ]
                """
            )
        );

        Assert.Equal(
            [
                ("a", "http://127.0.0.1:5005/", "http://ttd-one:5005/"),
                ("b", "http://127.0.0.1:5006/", null),
                ("c", "http://127.0.0.1:5007/", null),
            ],
            candidates.Select(c => (c.ContainerId, c.BaseUri.ToString(), c.FrontDoorUri?.ToString()))
        );
    }
}
