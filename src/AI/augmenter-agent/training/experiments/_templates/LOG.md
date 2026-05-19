# Log: exp-{{NAME}}

Chronological log of every iteration. Append-only. One block per run.

## Format per entry

```
### run-NNN  (YYYY-MM-DD HH:MM)
- **What changed since previous run**: (prompt structure, model param, ...)
- **Why**: (intent — what we hoped this change would reveal)
- **Result**: (verdict from evaluate.py + 1-2 sentence read of stdout)
- **Decision for next iteration**: (continue this direction / pivot / abandon)
```

If a run reveals a generalizable lesson (not just a result), copy it into `SYNTHESIS.md` immediately under "Observations".

---

### run-001  ({{DATE}} HH:MM)
- **What changed since previous run**: baseline — no changes from pipeline default
- **Why**: establish starting point
- **Result**:
- **Decision for next iteration**:
