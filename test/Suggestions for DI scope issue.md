## Issue description
Service owner had an implementation of `IInstantiationProcessor` that was registered as a Transient service, and used a class variable to store the user object from IHttpContextAccessor.
This would be fine if our code actually resolved the implementation in a transient context.
An error in our code caused IInstanceProcessor to be resolved as a dependency from a Singleton service, and thus only one instance was ever created.
This caused the class variable to be shared between all requests, and thus the user object to be shared between all requests, leaking the information from the first user that created an instance to all subsequent forms until the app was restarted in kubernetes.

## Immediate actions

### Go through all apps to see if any appears to have a similar issue with the .
See if we need to alert other service owners (not sure if Martin regards this as complete)

### Go through all Singleton services to ensure that they can really be singleton
This would have detected our error, and might find other similar issues (but is a one time job, not fixing things for the future)

## Future actions to reduce the risk of similar issues.

### Use IServiceProvider instead of injecting hook interfaces directly where they are used
This will have multiple benefits in addition to make Transient services (actually transient) when used from a Singleton service
* One class that wraps `IServiceProvider` for all our "officially supported" hook interfaces makes it obvious (in code) which interfaces are regarded as extension points and makes it easier to ensure consistent patterns and telemetry.
* Constructors for service implementations (that might be slow for /wrong/ code) will only run when actually required (not all calls to other endpoints on controller)
* We will have the ability to create a telemetry span for the `services.GetServices` call, highlighting slow constructors.

### Ensure(Verify) that apps by default runs with verifyScopes
Scoped services might otherwise inherit the root (singleton) scope, so this validation might help us catch issues.

### (Probably not) Suggest in documentation that hook interfaces gets registered with "AddScoped"
Will ensure that a similar issue will gets detected if the app DI runs with verifyScopes.
But if verifyScopes is off, this will cause cross request reuse if the service is resolved in a singleton context.
