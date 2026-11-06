# Navigation test app

This app exercises grouped page navigation, summary editing and subforms.

Run against the local frontend after starting localtest:

```sh
studioctl run --dev-frontend --path src/test/apps/navigation-test-subform
```

In the first task, open **Innsending → Oppsummering** to try return navigation:

- Edit **Fornavn** from its summary or link. Returning requires a value, using the task's return setting.
- Edit **Alder** from its summary or link. Its navigation component's Next setting overrides the page's disabled return setting.
- Edit **Etternavn**. The page explicitly allows returning with missing values.
- Follow **Se informasjon med returknapp**. Returning reveals errors on future pages without blocking navigation.
- Edit **Skjul sider**. Hiding **Tilbakemelding** or **Oppsummering** removes the return shortcut. Undoing the choice does not restore it. Hiding **Generell info**, before the edited page, keeps the shortcut.

The app and task settings live in `App/ui/Settings.json` and `App/ui/Task_1/Settings.json`.
The existing Cypress navigation spec covers these scenarios using those files and the real backend.
