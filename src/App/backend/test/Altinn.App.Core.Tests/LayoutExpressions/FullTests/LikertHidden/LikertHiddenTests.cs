using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Tests.LayoutExpressions.TestUtilities;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Tests.LayoutExpressions.FullTests.LikertHidden;

public class LikertHiddenTests
{
    [Fact]
    public async Task TestLikertWithMultipleComponents()
    {
        using var jsonDoc = JsonDocument.Parse(
            """
            {
                "root": {
                    "showLikert": false,
                    "questions": [
                        {
                            "altinnRowId": "11111111-1111-1111-1111-111111111111",
                            "Id": "question0",
                            "Answer": "Agree"
                        },
                        {
                            "altinnRowId": "22222222-2222-2222-2222-222222222222",
                            "Id": "question1",
                            "Answer": "Disagree"
                        },
                        {
                            "altinnRowId": "33333333-3333-3333-3333-333333333333",
                            "Id": "question2",
                            "Answer": "Neutral"
                        },
                        {
                            "altinnRowId": "44444444-4444-4444-4444-444444444444",
                            "Id": "question3",
                            "Answer": "Agree"
                        },
                        {
                            "altinnRowId": "55555555-5555-5555-5555-555555555555",
                            "Id": "question4",
                            "Answer": "StronglyAgree"
                        }
                    ]
                }
            }
            """
        );
        IInstanceDataAccessor dataAccessor = DynamicClassBuilder.DataAccessorFromJsonDocument(
            new Instance(),
            jsonDoc.RootElement
        );
        var data = await dataAccessor.GetFormData(dataAccessor.Instance.Data.First());
        var state = await LayoutTestUtils.GetLayoutModelTools(data, "LikertHidden");
        var hidden = await LayoutEvaluator.GetHiddenFieldsForRemoval(state, false);

        // Likert component does not yet remove answers when component is hidden
        Assert.Empty(hidden);
    }
}
