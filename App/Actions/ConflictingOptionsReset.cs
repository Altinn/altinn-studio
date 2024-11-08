using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Models;

namespace Altinn.App.Actions;

public class ConflictingOptionsReset : IUserAction
{
    public string Id => "conflictingOptionsReset";

    public async Task<UserActionResult> HandleAction(UserActionContext context)
    {
        var originalDataElement = context.DataMutator.DataElements.First(de => de.DataType == "ServiceModel-test");
        var originalData = await context.DataMutator.GetFormData(originalDataElement);
        var data = originalData as Skjema;

        SetDefaultData(data);

        return UserActionResult.SuccessResult(new List<ClientAction>());
    }

    public static void SetDefaultData(Skjema data)
    {
        data.ConflictingOptions = new ConflictingOptions();
        data.ConflictingOptions.IsForeign = false;
        data.ConflictingOptions.Animals = [
            new Animal
            {
                Name = "Katt",
                NumLegs = 4,
                Color = "BLACK,BROWN", // Brown is only possible when isForeign is true, black always works
                CommentLabels = "", // Let DataProcessor.cs figure this out
                Comments = new List<AnimalComment>
                {
                    new()
                    {
                        Type = "CRITICISM",
                        TypeLabel = "",
                        Text = "Her er en kritisk kommentar, for denne katten lukter vondt"
                    },
                    new()
                    {
                        Type = "PRAISE",
                        TypeLabel = "",
                        Text = "Her er en skrytende kommentar, for denne katten er så søt"
                    }
                }
            },
            new Animal
            {
                Name = "Tiger",
                NumLegs = 5, // 5 legs is not possible as long as isForeign is false
                Color = "RED,PINK", // Pink is only possible when isForeign is false, red always works
                CommentLabels = "", // Let DataProcessor.cs figure this out
                Comments = new List<AnimalComment>
                {
                    new()
                    {
                        Type = "SUGGESTION",
                        Text = "Her er et forslag til forbedring av denne tigeren"
                    },
                    new()
                    {
                        Type = "SPAM",
                        Text = "Her er en kommentar som er søppel, for KOM OG KJØP BILLIGE KLOMPELØVER"
                    }
                }
            }
        ];
    }
}