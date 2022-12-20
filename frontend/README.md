## Altinn Studio Frontend

### Lint checks

1. Execute `yarn --immutable`. This step is only nescessary if you have not already done it, or if you change branches.
2. Execute `yarn run lint`.

### Unit tests

1. Execute `yarn --immutable`. This step is only nescessary if you have not already done it, or if you change branches.
2. Execute `yarn run test`.

### Notes

#### After upgrading to react 18

Following can (probably) be deleted from webpack configs:

```
    fallback: {
      'react/jsx-runtime': 'react/jsx-runtime.js',
      'react/jsx-dev-runtime': 'react/jsx-dev-runtime.js',
    },
```
