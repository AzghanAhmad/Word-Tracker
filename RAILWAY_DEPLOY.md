# Deploy Word Tracker on Railway

## 1. MySQL (Railway database)

Your public MySQL proxy:

| Setting  | Value |
|----------|--------|
| Host     | `kodama.proxy.rlwy.net` |
| Port     | `43072` |
| User     | `root` |
| Database | `railway` |
| Password | *(from Railway MySQL service → Variables)* |

CLI example (do not commit passwords):

```bash
mysql -h kodama.proxy.rlwy.net -u root -p --port 43072 --protocol=TCP railway
```

## 2. Environment variables on the **web service**

In Railway → your app service → **Variables**, add:

### Required

**`DB_CONNECTION`** (single line, no quotes):

```
Server=kodama.proxy.rlwy.net;Port=43072;Database=railway;User=root;Password=YOUR_MYSQL_PASSWORD;SslMode=Required;
```

Replace `YOUR_MYSQL_PASSWORD` with the value from Railway MySQL (`MYSQLPASSWORD` or the password you set).

**`JWT_SECRET`** — at least 32 random characters, for example:

```
openssl rand -base64 32
```

### Optional (Railway sets automatically)

- **`PORT`** — Railway injects this; the app listens on `0.0.0.0:PORT`.

### Alternative: link MySQL plugin

If you **link** the MySQL service to the app, Railway may expose `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, or `MYSQL_URL`. The app builds `DB_CONNECTION` from those when `DB_CONNECTION` is not set.

You can still set `DB_CONNECTION` explicitly (recommended) so the host/port match your proxy.

## 3. Deploy

1. Connect the GitHub repo to Railway (or `railway up` from this folder).
2. Root **`Dockerfile`** builds frontend + .NET API in one image.
3. **`railway.toml`** uses that Dockerfile.
4. Push / redeploy after setting variables.

## 4. Verify after deploy

1. Open **Deployments → View logs**.
2. Look for:
   - `🔧 Setting Kestrel to listen on port: ...`
   - `🔍 DB_CONNECTION env var exists: True`
   - `✅ Database 'railway' initialized successfully`
3. Open your Railway URL → register/login → create a plan → log progress → open **Calendar** and confirm the same date as **Plan details**.

## 5. Local development

Copy connection string into user secrets or set env before run:

**PowerShell:**

```powershell
$env:DB_CONNECTION = "Server=kodama.proxy.rlwy.net;Port=43072;Database=railway;User=root;Password=YOUR_PASSWORD;SslMode=Required;"
$env:JWT_SECRET = "dev_secret_must_be_at_least_32_bytes_long_for_hs256"
cd backend/dotnet_migration_pending
dotnet run
```

**Frontend** (separate terminal):

```powershell
cd frontend
npm start
```

## 6. Security

- Do **not** commit real passwords in `appsettings.json` (use `REPLACE_IN_RAILWAY_ENV` locally and set `DB_CONNECTION` on Railway).
- Rotate MySQL password in Railway if it was ever shared in chat or committed to git.
