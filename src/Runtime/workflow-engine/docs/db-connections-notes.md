## DB Connections Notes

### See what's connected:
```postgresql
SELECT pid, usename, application_name, state, query_start, query
FROM pg_stat_activity
WHERE datname = 'workflow_engine';
```

### Terminate all connections to your database (except your own session):
```postgresql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'workflow_engine'
  AND pid <> pg_backend_pid();
```

### Terminate just idle connections if you want to be more surgical:
```postgresql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'workflow_engine'
  AND state = 'idle'
  AND pid <> pg_backend_pid();
```
