# Lantern

Lantern is an interpretive inspection framework for reasoning about fixed evidence artifacts.

It integrates with cryptographic receipt systems to support tamper-evident audit trails.
Currently demonstrated using HALO-RECEIPTS (private system; available by inquiry).

Lantern does not assert truth, intent, or legitimacy.
It demonstrates how conclusions change under explicit interpretive lenses.
> **Status**: Early research. Open to technical collaboration on cryptographic verification and interpretive frameworks.

## Evidence Walkthrough

See `/demos/evidence-walkthrough` for a complete example of Lantern's interpretive discipline applied to a fixed exhibit.

## Quick Start

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5000`.

## Production Build

```bash
npm run build
npm start
```

## How to Open the External App URL (Replit)

1. In the Replit workspace, look for the **Webview** panel on the right side
2. Click the **"Open in new tab"** button (square with arrow icon) in the Webview header
3. Alternatively, copy the URL from the Webview address bar and paste it into a new browser tab

If you don't see a Webview panel:
- Ensure the workflow is running (green status)
- Try refreshing the page
- Check the Console for error messages

## Troubleshooting

### White Screen / App Won't Load

1. Check the Console for errors
2. Visit `/__boot` (dev only) to verify the server is responding
3. If `/__boot` loads but the app doesn't, the issue is in the React layer

### EADDRINUSE Error

This error means another process is already using port 5000.

**Fix:**
1. Stop all running workflows
2. Wait 5 seconds for the port to release
3. Restart the workflow

The server will now display a clear error message with fix instructions if this occurs.

### Stale Process

If the app behaves unexpectedly:
1. Stop the workflow completely
2. Wait for the Console to show no activity
3. Start the workflow again

## Architecture

- **Frontend**: React + Vite + TypeScript
- **Storage**: Browser localStorage (local-first design)
- **Server**: Express (static asset host in production)

## Development Routes (Dev Only)

These routes are disabled in production:

- `/__boot` - Plain HTML boot test
- `/__health` - JSON health check with PID

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run check` | TypeScript type check |
