using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Tests.LayoutExpressions.FullTests.RepeatingGroupsHidden;

public class RepeatingGroupsHidden
{
    [Theory]
    [InlineData(false, false)]
    [InlineData(true, false)]
    [InlineData(false, true)]
    [InlineData(true, true)]
    public async Task Test_Hidden_Multiple_Groups(bool hidePage1, bool hidePage2)
    {
        var jsonData = $$"""
            {
                "some": {
                    "hidePage1": {{(hidePage1 ? "true" : "false")}},
                    "hidePage2": {{(hidePage2 ? "true" : "false")}},
                    "hideGroup1": true,
                    "data": [
                        {
                            "prodVareNr": "000140",
                            "prodType": null,
                            "prodBeskrivelse": "Sei er ikke godt",
                            "prodMengde": 2,
                            "prodMengdeEnhet": "kg",
                            "prodMengdeEnhetNavn": null
                        },
                        {
                            "prodVareNr": null,
                            "prodType": null,
                            "prodBeskrivelse": "Sei er ikke godt",
                            "prodMengde": 2,
                            "prodMengdeEnhet": "kg",
                            "prodMengdeEnhetNavn": null
                        }
                    ]
                }
            }
            """;
        using var jsonDoc = JsonDocument.Parse(jsonData);
        IInstanceDataAccessor dataAccessor = DynamicClassBuilder.DataAccessorFromJsonDocument(
            new Instance(),
            jsonDoc.RootElement
        );
        var data = await dataAccessor.GetFormData(dataAccessor.Instance.Data.First());
        var state = await LayoutTestUtils.GetLayoutModelTools(data, "RepeatingGroupsHidden");
        var hidden = await LayoutEvaluator.GetHiddenFieldsForRemoval(state);

        await Verify(hidden.OrderBy(d => d.DataElementIdentifier.Guid).ThenBy(d => d.Field))
            .UseParameters(hidePage1, hidePage2);
    }
}
