using System.Xml.Linq;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class PolicyParser
{
    private const string FileRel = "App/config/authorization/policy.xml";
    private const string OrgId = "urn:altinn:org";
    private const string AppId = "urn:altinn:app";

    public static void Parse(AppModelBuilder app, IAppDirectory dir)
    {
        var data = dir.ReadAllBytes(FileRel);
        if (data is null)
            return;

        if (!SourceParse.TryXml(app, FileRel, data, out var doc))
            return;

        var policy = doc.Root;
        if (policy is null)
            return;

        var lineStarts = Spans.LineStarts(data);
        var rules = policy.Elements().Where(e => e.Name.LocalName == "Rule").ToArray();
        for (int ri = 0; ri < rules.Length; ri++)
        {
            var targets = rules[ri].Elements().Where(e => e.Name.LocalName == "Target").ToArray();
            for (int ti = 0; ti < targets.Length; ti++)
            {
                CollectFromTarget(app, ri, ti, targets[ti], data, lineStarts);
            }
        }
    }

    private static void CollectFromTarget(
        AppModelBuilder app,
        int ri,
        int ti,
        XElement target,
        byte[] data,
        int[] lineStarts
    )
    {
        var anyOfs = target.Elements().Where(e => e.Name.LocalName == "AnyOf").ToArray();
        for (int ai = 0; ai < anyOfs.Length; ai++)
        {
            var allOfs = anyOfs[ai].Elements().Where(e => e.Name.LocalName == "AllOf").ToArray();
            for (int li = 0; li < allOfs.Length; li++)
            {
                var matches = allOfs[li].Elements().Where(e => e.Name.LocalName == "Match").ToArray();
                for (int mi = 0; mi < matches.Length; mi++)
                {
                    var m = matches[mi];
                    var attrValue = m.Elements().FirstOrDefault(e => e.Name.LocalName == "AttributeValue")?.Value;
                    var designator = m.Elements().FirstOrDefault(e => e.Name.LocalName == "AttributeDesignator");
                    var attrId = designator?.Attribute("AttributeId")?.Value ?? "";

                    var v = (attrValue ?? "").Trim();
                    if (v.Length == 0)
                        continue;

                    var ptr = $"/Rule[{ri}]/Target[{ti}]/AnyOf[{ai}]/AllOf[{li}]/Match[{mi}]";
                    var (line, col) = XmlPositions.LineCol(m, data, lineStarts);
                    var pos = new SourceSpan(FileRel, ptr, line, col);

                    switch (attrId)
                    {
                        case OrgId:
                        case AppId:
                            app.Refs.PolicyOrgApps.Add(new PolicyAttributeValue(attrId, v, pos));
                            break;
                    }
                }
            }
        }
    }
}
