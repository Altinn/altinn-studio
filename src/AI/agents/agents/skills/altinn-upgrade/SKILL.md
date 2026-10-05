---
description: Fix the TODOs and blockers that upgrade_app_to_v9 leaves. Load when the upgrade reports TODOs, and again when the user accepts your offer to fix them.
title: Oppgradering til v9
---

# Fix what the v9 upgrade leaves

`upgrade_app_to_v9` runs the official upgrade. Some changes need work that the upgrade cannot do. The upgrade reports this work as `[TODO]` messages, and it writes TODO comments in some of the files that it creates. There are two cases:

- **Completed with TODOs**: the app is on v9. Commit the upgrade first, as usual.
- **Held back**: layouts or legacy rules need manual work, so the upgrade changed nothing. The app is still on v8.

## The work takes two turns

### Turn 1: the user asked for the upgrade

Do not fix anything in this turn. The user must first know what you will change.

1. For each TODO, read the files that it names, so that your assessment is correct. Do not guess from the message only.
2. Put each TODO in one of three groups. "Assess each TODO" below tells you which group.
   - You can fix it.
   - You can fix it after the user makes a decision.
   - The user must fix it.
3. In your final message, tell the user:
   - what the upgrade did, or why it is held back;
   - the TODOs that you can fix, one line each, with the file;
   - the decisions that you need, each as a question with the options;
   - the TODOs that the user must fix, with the reason;
   - at the end, one offer, for example "Vil du at jeg fikser punktene jeg kan fikse?".

Write the full list. The next turn sees only your final message, not the tool results.

If you can fix none of the TODOs, make no offer. Tell the user what to do.

### Turn 2: the user accepted the offer

1. Run `upgrade_app_to_v9` again. It gives the current list. The steps for the app version below tell you what to do with it.
2. Fix only what you offered, and what the user decided. Do not fix other things.
3. Run `verify_changes`. It builds the app when C# changed. Correct the errors that it reports.
4. If a fix does not verify and you cannot correct it, discard it with `discard_file_changes`, and tell the user.
5. Commit. In the body of the commit message, list the TODOs that you fixed and the TODOs that remain.
6. In your final message, tell the user what you fixed and what remains. Tell the user to test the form, because the upgrade changes the logic of the app.

## Assess each TODO

### You can fix

- **A legacy rule that the upgrade could not convert to an expression** (`MANUAL_CONVERSION_REQUIRED`). Write a `hidden` expression with the same condition as the JavaScript function (`skill(altinn-expressions)`), and remove the rule from `RuleConfiguration.json`.
- **A rule with no effect**: the function is not in `RuleHandler.js`, the component does not exist, or the rule has no target. Remove the rule from `RuleConfiguration.json`, and tell the user that it had no effect.
- **Conflicting bindings or removed layout properties** (`mapping`, `queryParameters`, `bindingToShowInSummary`, or an old and a new property name on the same component). Keep the value that the app uses, and remove the other.
- **A layout or another JSON file that does not parse.** Correct the JSON.
- **C# that uses a removed API, when the TODO gives the replacement**:
  - `IText` and `TextClient`: inject `IAppResources`, and call `GetTexts(org, app, language)`.
  - `PlatformHttpException` constructors, `WithData` calls for correspondence, namespaces, and the members that the TODO names.
  - A `CancellationToken` parameter that the upgrade could not add.
  - A package below the v9 floor: add the `PackageReference` that the TODO gives.
  - A data processor that is not registered: add `services.AddTransient<IDataWriteProcessor, X>();` in `RegisterCustomAppServices` in `App/Program.cs`.
- **A generated data processor method that throws `NotImplementedException`.** The original JavaScript and the rule configuration are in the comments above the method. Write the same logic in C#.
- **The review TODO in generated code** (`TODO: IMPORTANT - Review all generated code below!`). Compare the generated C# with the JavaScript in the comments, and correct the differences. Tell the user that you did this, and that the user must test it.
- **File names that differ only in case.** Give the files the names that the TODO gives.

### You can fix after a decision from the user

Ask the question in turn 1. Fix it in turn 2 with the answer.

- **Service task results** (`ServiceTaskResult`, `FailedAbortProcessNext`, `FailedContinueProcessNext`, `ServiceTaskErrorHandling`). Ask what a failure must do: `FailedPermanent("…")` when the error does not go away, `FailedRetryable("…")` when the platform must try again, or `Success("action")` when the process continues with an action. Tell the user that a service task in v9 can run more than one time, so it must not send the same message two times.
- **Task hooks** (`IProcessTaskStart`, `IProcessTaskEnd`, `IProcessTaskAbandon`). The new interfaces are `IOnTaskStartingHandler`, `IOnTaskEndingHandler` and `IOnTaskAbandonHandler`. Ask for which tasks each hook runs (`ShouldRunForTask`), and what a failure must do (`HookResult.FailedRetryable` or `HookResult.FailedPermanent`). Prefill moves to `IInstantiationProcessor.DataCreation`.
- **An eFormidling task that is disabled** (`<altinn:disabled>`), or a `feedback` task after a service task. Ask if the app must send, and if the task is only there to wait.
- **Policy rules** that the upgrade could not add, or that use `Deny`. Ask who must have the right. The policy controls access, so never guess.
- **`Index.cshtml` with Razor code** or with elements that the upgrade does not know. Ask what the custom code must do. Then move it to `App/config/assets.json`, or to `App/wwwroot/custom-js` and `App/wwwroot/custom-css`.

### The user must fix

- **Maskinporten scopes** that are not literals in the code. The user must check the scopes in Altinn Studio.
- **Anything outside the app repository**, for example settings in an environment or in another system.
- **A TODO that you do not understand**, or code that you cannot read. Say so. Do not guess.
