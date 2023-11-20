## Mock of Altinn Notifications for localtest

Repository: https://github.com/Altinn/altinn-notifications

Things to be aware of when copying code: 

- Persistence: code should not be copied directly, rather create a new implementation of the required repository class/method that writes data to disk.- Controllers: code should be copied, but changes might be required related to authorization (e.g., platform access token is not included in local requests)
- Core: code can be copied directly without changes 

Update Startup.cs with required services.