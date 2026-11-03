using System.Text.RegularExpressions;
using YamlDotNet.Core;
using YamlDotNet.Core.Events;
using YamlDotNet.Serialization;

namespace Altinn.Studio.Gateway.Api.Tests;

/// <summary>
/// Pins the workflow engine's NetworkPolicy rule for the gateway against the manifests it has
/// to agree with. The kind fixture behind <see cref="KubernetesNetworkPolicyTests"/> does not
/// deploy the engine, so the one rule that makes the whole pass-through reachable has no live
/// test; this catches the drift that would otherwise surface only as a 502 in a real cluster —
/// a renamed pod label, a moved namespace, a changed engine port.
/// </summary>
/// <remarks>
/// Read as a generic YAML tree on purpose: the typed Kubernetes models rename keys (<c>from</c>
/// becomes <c>FromProperty</c>) and the AOT client keeps its YAML loader internal, and a
/// structural assertion over four small documents does not need either.
/// </remarks>
public sealed class EngineNetworkPolicyManifestTests
{
    private const string LinkerdInboundProxyPort = "4143";

    private static readonly string _repoRoot = FindRepoRoot();
    private static readonly IDeserializer _yaml = new DeserializerBuilder().Build();

    [Fact]
    public void GatewayIngressRule_MatchesTheGatewayPodsAndTheEnginePort()
    {
        var policy = Load("src/Runtime/workflow-engine-app/infra/kustomize/base/networkpolicy.yaml").Single();
        var gateway = Load("src/Runtime/gateway/infra/kustomize/base/deployment.yaml")
            .Single(document => (string)At(document, "kind") == "Deployment");
        var engineService = Load("src/Runtime/workflow-engine-app/infra/kustomize/base/service.yaml").Single();

        // The gateway rule is the one that names pods; the pre-existing app rule admits a whole
        // namespace and has no pod selector.
        var rule = Assert.Single(
            Sequence(At(policy, "spec", "ingress")),
            r => Sequence(At(r, "from")).Any(peer => Map(peer).ContainsKey("podSelector"))
        );
        var peer = Assert.Single(Sequence(At(rule, "from")));

        Assert.Equal(GatewayNamespace(), At(peer, "namespaceSelector", "matchLabels", "kubernetes.io/metadata.name"));

        // Every label the rule selects on must be a label the gateway's pods actually carry.
        var selected = Map(At(peer, "podSelector", "matchLabels"));
        var podLabels = Map(At(gateway, "spec", "template", "metadata", "labels"));
        Assert.NotEmpty(selected);
        Assert.All(selected, label => Assert.Equal(label.Value, Assert.Contains(label.Key, podLabels)));

        var enginePort = At(Assert.Single(Sequence(At(engineService, "spec", "ports"))), "targetPort");
        var ports = Sequence(At(rule, "ports"))
            .Select(p => (Port: At(p, "port"), Protocol: At(p, "protocol")))
            .ToList();
        Assert.Contains(ports, p => Equals(p.Port, enginePort) && Equals(p.Protocol, "TCP"));
        Assert.Contains(ports, p => Equals(p.Port, LinkerdInboundProxyPort) && Equals(p.Protocol, "TCP"));
    }

    /// <summary>
    /// The namespace is assigned by the Flux Kustomization in the runtime syncroot, not by the
    /// gateway's own kustomize base, and that document carries exactly one such key.
    /// </summary>
    private static string GatewayNamespace()
    {
        var syncroot = Read("infra/runtime/syncroot/base/gateway.yaml");
        var match = Regex.Match(syncroot, @"^\s*targetNamespace:\s*(\S+)\s*$", RegexOptions.Multiline);
        Assert.True(match.Success, "The gateway syncroot no longer declares a targetNamespace.");
        return match.Groups[1].Value;
    }

    private static object At(object node, params string[] path)
    {
        foreach (var key in path)
            node = Assert.Contains(key, Map(node));
        return node;
    }

    private static Dictionary<object, object> Map(object node) => Assert.IsType<Dictionary<object, object>>(node);

    private static List<object> Sequence(object node) => Assert.IsType<List<object>>(node);

    private static List<Dictionary<object, object>> Load(string repoRelativePath)
    {
        using var reader = new StringReader(Read(repoRelativePath));
        var parser = new Parser(reader);
        var documents = new List<Dictionary<object, object>>();
        parser.Consume<StreamStart>();
        while (parser.Accept<DocumentStart>(out _))
            documents.Add(_yaml.Deserialize<Dictionary<object, object>>(parser));
        return documents;
    }

    private static string Read(string repoRelativePath) => File.ReadAllText(Path.Combine(_repoRoot, repoRelativePath));

    private static string FindRepoRoot()
    {
        for (var dir = new DirectoryInfo(AppContext.BaseDirectory); dir is not null; dir = dir.Parent)
        {
            if (Directory.Exists(Path.Combine(dir.FullName, "src", "Runtime", "gateway")))
                return dir.FullName;
        }

        throw new InvalidOperationException("Could not locate the repository root from the test assembly.");
    }
}
