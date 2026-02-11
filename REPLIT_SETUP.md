# Replit Setup Guide for Lantern

This guide will help you set up and run the Lantern project on Replit.

## Quick Start

1. **Fork or Import this repository to Replit**
   - Go to [Replit](https://replit.com)
   - Click "Create" → "Import from GitHub"
   - Enter the repository URL: `https://github.com/Swixixle/Lantern`

2. **Configure PostgreSQL**
   - The `.replit` file already includes `postgresql-16` module
   - Replit will automatically provision a PostgreSQL database
   - The `DATABASE_URL` environment variable is automatically set by Replit

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Initialize the Database**
   ```bash
   npm run db:push
   ```

5. **Start the Application**
   - Click the "Run" button in Replit
   - Or use the command: `npm run dev`
   - The app will be available at the URL shown in the Webview panel

## Environment Variables

The following environment variables are automatically configured on Replit:

### Automatically Set by Replit
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `PORT` - Application port (default: 5000, configured in `.replit`)

### Optional Variables
You can add these in the Replit "Secrets" tab (🔒 icon in the sidebar):

- `LANTERN_API_KEY` - API key for restricted endpoints (optional)
- `LANTERN_PUBLIC_READONLY` - Set to "true" for public read-only access (default: false)
- `NODE_ENV` - Set to "production" for production builds (default: development)

## Project Structure

```
Lantern/
├── client/          # React frontend (Vite + TypeScript)
├── server/          # Express backend
├── shared/          # Shared schemas and types
├── .replit          # Replit configuration
├── replit.nix       # Nix dependencies
└── package.json     # Node.js dependencies
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (runs both client & server) |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run check` | TypeScript type check |
| `npm run db:push` | Push database schema to PostgreSQL |

## Accessing the Application

### Development Mode
1. Click the "Run" button in Replit
2. The Webview panel will show your app
3. Click the "Open in new tab" button (↗️) to open in a full browser window

### Production Deployment
Replit automatically deploys your app when you:
1. Click "Deploy" in the Replit interface
2. Choose "Autoscale" deployment (already configured in `.replit`)
3. The app will be built using `npm run build` and served with `node ./dist/index.cjs`

## Troubleshooting

### "Cannot connect to database" Error
1. Verify PostgreSQL module is enabled in `.replit`
2. Check that `DATABASE_URL` is set in Replit's environment
3. Run `npm run db:push` to ensure tables are created

### "EADDRINUSE: Port 5000 already in use"
1. Stop all running workflows in Replit
2. Wait 5 seconds for the port to release
3. Click "Run" again

### White Screen / App Won't Load
1. Check the Console for errors
2. Visit `/__boot` (dev only) to verify the server is responding
3. Check that `npm install` completed successfully

### Database Schema Issues
If you see database-related errors:
```bash
npm run db:push
```
This will sync your database schema with the latest version.

## Key Features Configured

- ✅ **PostgreSQL Database** - Automatic provisioning via Replit modules
- ✅ **Hot Reload** - Development server with instant updates
- ✅ **Production Build** - Optimized bundle for deployment
- ✅ **Port Forwarding** - External access configured (port 5000 → 80)
- ✅ **Web Worker Support** - Client-side extraction for documents
- ✅ **Canvas Support** - Native canvas rendering with required libraries

## Architecture

Lantern uses a **client-heavy hybrid** architecture:

- **Frontend**: React 18 + Vite + TypeScript single-page application
- **Storage**: IndexedDB for local-first data persistence
- **Server**: Express server with extraction job queue
- **Database**: PostgreSQL for durable job queue persistence

### Data Flow
1. Small documents (<75K chars) → Browser Web Worker
2. Large documents (≥75K chars) → Server-side job queue (PostgreSQL)
3. All extracted data → IndexedDB (local-first)
4. Job state → PostgreSQL (for durability across page refreshes)

## Development Workflow

1. **Make Changes** - Edit files in the Replit editor
2. **Auto-Reload** - Vite will automatically reload the frontend
3. **Test** - Use the Webview to test your changes
4. **Commit** - Use Replit's Git integration to commit changes
5. **Deploy** - Use Replit's Deploy feature for production

## Support

- **Documentation**: See `/docs` folder for detailed guides
- **Issues**: Report bugs on GitHub Issues
- **Replit Help**: Refer to `replit.md` for detailed troubleshooting

## Security Notes

- Never commit `.env` files (already in `.gitignore`)
- Use Replit Secrets for sensitive environment variables
- The `LANTERN_API_KEY` should be set in Secrets, not in code
- Database credentials are automatically managed by Replit

## Next Steps

After setup, you can:
1. Upload documents for analysis in the Lantern Extract page
2. Create dossiers with curated evidence
3. Generate publication-ready reports
4. Export verified records with cryptographic integrity

Enjoy using Lantern! 🏮
