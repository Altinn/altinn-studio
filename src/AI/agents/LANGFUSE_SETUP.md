# Langfuse Setup Guide

## Quick Start: Langfuse Cloud (Recommended)

**Easiest option - no installation needed!**

1. **Sign up:** https://cloud.langfuse.com (free tier available)
2. **Create a project** in the Langfuse dashboard
3. **Get API keys:**
   - Go to Settings → API Keys
   - Click "Create new key pair"
   - Copy the Secret Key and Public Key
4. **Update `.env`:**
   ```bash
   LANGFUSE_SECRET_KEY=sk-lf-xxx...  # Paste your secret key
   LANGFUSE_PUBLIC_KEY=pk-lf-xxx...  # Paste your public key
   LANGFUSE_HOST=https://cloud.langfuse.com
   LANGFUSE_ENABLED=true
   ```
5. **Restart your application**
6. **View traces:** https://cloud.langfuse.com

---

## Self-Hosted: Local Langfuse Server

**For full control and data privacy**

### Using Docker Compose

1. **Start Langfuse:**

   ```bash
   docker-compose -f docker-compose.langfuse.yml up -d
   ```

2. **Wait for startup:**

   ```bash
   # Check logs
   docker-compose -f docker-compose.langfuse.yml logs -f langfuse-server

   # Wait for "ready on http://0.0.0.0:3000"
   ```

3. **Open Langfuse UI:** http://localhost:3005

4. **Initial setup:**
   - Create admin account (first time only)
   - Create a project
   - Go to Settings → API Keys
   - Create new key pair

5. **Update `.env`:**

   ```bash
   LANGFUSE_SECRET_KEY=sk-lf-xxx...  # From Langfuse UI
   LANGFUSE_PUBLIC_KEY=pk-lf-xxx...  # From Langfuse UI
   LANGFUSE_HOST=http://localhost:3005
   LANGFUSE_ENABLED=true
   ```

6. **Restart your application**

### Stop Langfuse

```bash
docker-compose -f docker-compose.langfuse.yml down
```

### Stop and Remove Data

```bash
docker-compose -f docker-compose.langfuse.yml down -v
```

---

## Troubleshooting

### "Connection refused" or "Failed to initialize Langfuse"

**For Cloud:**

- Check your SECRET_KEY and PUBLIC_KEY are correct
- Verify LANGFUSE_HOST=https://cloud.langfuse.com
- Check internet connection

**For Self-Hosted:**

- Ensure Docker containers are running: `docker ps`
- Check Langfuse logs: `docker-compose -f docker-compose.langfuse.yml logs`
- Verify port 3005 is not blocked: `curl http://localhost:3005`

### "Langfuse initialized but no traces appearing"

1. Check if Langfuse is actually enabled:

   ```bash
   cat .env | grep LANGFUSE_ENABLED
   # Should show: LANGFUSE_ENABLED=true
   ```

2. Verify your API keys match the project in Langfuse UI

3. Check application logs for errors

4. Try flushing traces manually (for testing):
   ```python
   from shared.utils.langfuse_utils import flush_langfuse
   flush_langfuse()
   ```

### Database connection issues (Self-Hosted)

If Langfuse won't start:

```bash
# Check database status
docker-compose -f docker-compose.langfuse.yml ps

# Restart services
docker-compose -f docker-compose.langfuse.yml restart
```

---

## Comparison: Cloud vs Self-Hosted

| Feature       | Cloud               | Self-Hosted                   |
| ------------- | ------------------- | ----------------------------- |
| Setup time    | 5 minutes           | 10-15 minutes                 |
| Maintenance   | None                | Docker updates                |
| Cost          | Free tier available | Free (your infrastructure)    |
| Data location | Langfuse servers    | Your infrastructure           |
| Scalability   | Managed             | Manual                        |
| Best for      | Quick start, teams  | Privacy-sensitive, air-gapped |

---

## Verification

After setup, test with:

```python
# Test in Python
from shared.utils.langfuse_utils import get_langfuse_client

client = get_langfuse_client()
print(f"Langfuse client: {client}")

# Create test trace
client.trace(name="test_trace", input={"test": "data"})
client.flush()
print("✅ Test trace sent!")
```

Then check your Langfuse UI - you should see the test trace appear!

---

## Next Steps

Once Langfuse is running:

1. ✅ Start your agent application
2. ✅ Run a workflow
3. ✅ View traces in Langfuse UI
4. ✅ Explore features:
   - Trace timeline and spans
   - Token usage and costs
   - Performance metrics
   - Session grouping
   - Evaluation workflows

---

## Documentation

- Langfuse Docs: https://langfuse.com/docs
- Self-Hosting Guide: https://langfuse.com/docs/deployment/self-host
- API Reference: https://langfuse.com/docs/sdk/python
