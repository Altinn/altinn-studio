using System.Net;
using System.Text.Json.Nodes;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Xunit.Abstractions;
using static Altinn.App.Integration.Tests.Upgrade.UpgradeTestHelpers;

namespace Altinn.App.Integration.Tests.Upgrade;

/// <summary>
/// The ttd/signering-brukerstyrt app from altinn.studio across the v8 -> v9 upgrade. The founders entered in Task_1
/// sign in SigningTask_Founders. The app's own gateway then decides on SigningTask_Auditor from the form's Revisor
/// answer.
/// </summary>
[Trait("Category", "Integration")]
public class SigningUpgradeTests(ITestOutputHelper output)
{
    // localtest's built-in users. The founders' names must match the register for the app to accept them as signees
    private const int FillerUserId = 1337;
    private const string FillerPartyId = "501337";
    private const int FirstFounderUserId = 1002;
    private const int FirstFounderPartyId = 510002;
    private const int SecondFounderUserId = 1003;
    private const int SecondFounderPartyId = 510003;

    private const string SignatureDataType = "signatures-founders";
    private const string SigningPdfDataType = "signatures-founders-pdf";

    [Fact]
    public async Task SigningStartedOnV8_CompletesOnV9()
    {
        await using var fixture = await AppFixture.Create(output, TestApps.SigneringBrukerstyrtV8);
        string filler = await fixture.Auth.GetUserToken(userId: FillerUserId);
        string firstFounder = await fixture.Auth.GetUserToken(FirstFounderUserId, FirstFounderPartyId);
        string secondFounder = await fixture.Auth.GetUserToken(SecondFounderUserId, SecondFounderPartyId);
        await AssertLibraryMajorVersion(fixture, 8);

        // In SigningTask_Founders. v8 created the signee states and delegated signing to both founders on entry
        using var unsigned = await Instantiate(fixture, filler, FillerPartyId);
        await FillInFounders(fixture, filler, unsigned, hasAuditorAnswer: true);
        await AssertProcessNext(fixture, filler, unsigned, action: null, expectedTask: "SigningTask_Founders");

        // In SigningTask_Founders with the first founder's signature
        using var halfSigned = await Instantiate(fixture, filler, FillerPartyId);
        await FillInFounders(fixture, filler, halfSigned, hasAuditorAnswer: true);
        await AssertProcessNext(fixture, filler, halfSigned, action: null, expectedTask: "SigningTask_Founders");
        await AssertAction(fixture, firstFounder, halfSigned, "sign");

        await fixture.UpgradeTo(TestApps.SigneringBrukerstyrtV9);
        await AssertLibraryMajorVersion(fixture, 9);

        // Both founders sign on v9 against the signee states and delegations v8 created
        await AssertAction(fixture, firstFounder, unsigned, "sign");
        await AssertAction(fixture, secondFounder, unsigned, "sign");
        await AssertProcessNext(fixture, filler, unsigned, action: "sign", expectedTask: null);
        await AssertSigningCompleted(fixture, filler, unsigned);

        // The second founder's signature on v9 completes the signing next to the first founder's from v8
        await AssertAction(fixture, secondFounder, halfSigned, "sign");
        await AssertProcessNext(fixture, filler, halfSigned, action: "sign", expectedTask: null);
        await AssertSigningCompleted(fixture, filler, halfSigned);
    }

    [Fact(
        Skip = "Known gap: when the app's gateway throws, v9 has already set the instance to processing and keeps "
            + "it there while the engine retries. v8 answered 500 and left the instance as it was. See "
            + "https://github.com/Altinn/altinn-studio/pull/20388#issuecomment-6033686731"
    )]
    public async Task GatewayExceptionAfterUpgrade_LeavesTheInstanceAsItWas()
    {
        await using var fixture = await AppFixture.Create(output, TestApps.SigneringBrukerstyrtV8);
        string filler = await fixture.Auth.GetUserToken(userId: FillerUserId);
        string firstFounder = await fixture.Auth.GetUserToken(FirstFounderUserId, FirstFounderPartyId);
        string secondFounder = await fixture.Auth.GetUserToken(SecondFounderUserId, SecondFounderPartyId);

        // Without a Revisor answer the app's HasAuditorProcessGateway throws once the founders have signed
        using var noAuditorAnswer = await Instantiate(fixture, filler, FillerPartyId);
        await FillInFounders(fixture, filler, noAuditorAnswer, hasAuditorAnswer: false);
        await AssertProcessNext(fixture, filler, noAuditorAnswer, action: null, expectedTask: "SigningTask_Founders");
        await AssertAction(fixture, firstFounder, noAuditorAnswer, "sign");
        await AssertAction(fixture, secondFounder, noAuditorAnswer, "sign");

        await fixture.UpgradeTo(TestApps.SigneringBrukerstyrtV9);

        // v9 waits for the workflow before it answers, and the engine retries the failing gateway for up to a day
        using var answerTimeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        try
        {
            using var failed = await fixture.Instances.ProcessNext(
                filler,
                noAuditorAnswer,
                cancellationToken: answerTimeout.Token
            );
            Assert.NotEqual(HttpStatusCode.OK, failed.Response.StatusCode);
        }
        catch (OperationCanceledException) when (answerTimeout.IsCancellationRequested)
        {
            Assert.Fail("process/next did not answer within 30s while the workflow engine retried the gateway");
        }
        fixture.TestErrored = false;
        Instance instance = await GetInstance(fixture, filler, noAuditorAnswer);
        Assert.Equal("SigningTask_Founders", instance.Process.CurrentTask?.ElementId);
        Assert.NotEqual(ProcessStatus.Processing, instance.Process.Status);
    }

    private static async Task FillInFounders(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance,
        bool hasAuditorAnswer
    )
    {
        await SetFormValue(fixture, token, instance, "Skjemadata", "Selskapsnavn", "Upgrade AS");
        await SetFormValue(
            fixture,
            token,
            instance,
            "Skjemadata",
            "StifterPerson",
            JsonNode.Parse(
                """
                [
                  { "Fornavn": "Gjentagende", "Etternavn": "Forelder", "Foedselsnummer": "17858296439", "Epost": "gjentagende@example.invalid" },
                  { "Fornavn": "Rik", "Etternavn": "Forelder", "Foedselsnummer": "08829698278", "Epost": "rik@example.invalid" }
                ]
                """
            )
        );
        await SetFormValue(fixture, token, instance, "Skjemadata", "StifterVirksomhet", new JsonArray());
        if (hasAuditorAnswer)
            await SetFormValue(
                fixture,
                token,
                instance,
                "Skjemadata",
                "Revisor",
                new JsonObject { ["HarRevisor"] = "nei" }
            );
    }

    private static async Task AssertSigningCompleted(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        List<DataElement> dataElements = await GetStorageDataElements(fixture, token, instance);
        DataElement signingPdf = Assert.Single(dataElements, d => d.DataType == SigningPdfDataType);
        Assert.Equal("SigningTask_Founders", GeneratedFromTask(signingPdf));
        // One signature from each founder, and one from the filler, whose process/next on a signing task is a sign
        // action too. v8 does the same.
        Assert.Equal(3, dataElements.Count(d => d.DataType == SignatureDataType));
    }
}
