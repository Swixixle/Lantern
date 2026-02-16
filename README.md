# Lantern

Lantern is an interpretive inspection framework for reasoning about fixed evidence artifacts.

It integrates with cryptographic receipt systems to support tamper-evident audit trails. Currently demonstrated using HALO-RECEIPTS (private system; available by inquiry).

Lantern does not assert truth, intent, or legitimacy. It demonstrates how conclusions change under explicit interpretive lenses.

> **Status**: Early research. Open to technical collaboration on cryptographic verification and interpretive frameworks.

## Deploy to Replit

[![Run on Replit](https://replit.com/badge/github/Swixixle/Lantern)](https://replit.com/new/github/Swixixle/Lantern)

**→ See [REPLIT_SETUP.md](./REPLIT_SETUP.md) for detailed Replit deployment instructions**

## Key Features

- **Interpretive Lenses**: Analyze evidence under multiple explicit interpretive frameworks
- **Tamper-Evident Trails**: Cryptographic chain-of-custody with SHA-256 hashing
- **Encrypted Storage**: AES-256-GCM encryption for sources at rest
- **Append-Only Ledger**: Complete audit trail of all evidence operations
- **Evidence Export**: Comprehensive ZIP bundles with integrity verification
- **Docker Deployment**: Production-ready containerized deployment
- **RBAC**: Role-based access control (Lead Investigator, Reviewer, Auditor)
- **Local-First Design**: Browser-based UI with persistent backend storage
- **Epistemic Discipline**: Clear separation between facts, claims, and interpretations
- **Verification Support**: Tamper detection and integrity verification for evidence bundles

## Evidence Walkthrough

See `/demos/evidence-walkthrough` for a complete example of Lantern's interpretive discipline applied to a fixed exhibit.

## Installation

### Local Development

**Prerequisites:**
- Node.js 20+ 
- PostgreSQL 16+
- npm or yarn

**Clone and install:**
```bash
git clone https://github.com/Swixixle/Lantern.git
cd Lantern
npm install
```

**Configure environment:**
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and set:
# 1. DATABASE_URL - PostgreSQL connection string
# 2. LANTERN_VAULT_KEY - Encryption key (generate with: openssl rand -hex 32)
# Example: DATABASE_URL=postgresql://user:password@localhost:5432/lantern
```

**Security Configuration (REQUIRED):**
```bash
# Generate a secure encryption key
openssl rand -hex 32

# Add to .env file
LANTERN_VAULT_KEY=your-generated-64-character-hex-key
```

**Initialize database:**
```bash
npm run db:push
```

### Docker Deployment (Recommended for Production)

For production deployment with PostgreSQL and automated setup:

```bash
# Generate required secrets
openssl rand -base64 32  # PostgreSQL password
openssl rand -hex 32      # Encryption vault key

# Configure environment
cp .env.docker .env
# Edit .env and set POSTGRES_PASSWORD and LANTERN_VAULT_KEY

# Start services
docker-compose up -d

# Initialize database
docker-compose exec lantern npm run db:push

# View logs
docker-compose logs -f
```

**See [docs/DOCKER_DEPLOY.md](./docs/DOCKER_DEPLOY.md) for complete deployment guide.**

### Replit Deployment (Recommended for Quick Start)

For the easiest setup, deploy to Replit with automatic PostgreSQL provisioning:

[![Run on Replit](https://replit.com/badge/github/Swixixle/Lantern)](https://replit.com/new/github/Swixixle/Lantern)

See [REPLIT_SETUP.md](./REPLIT_SETUP.md) for detailed instructions.
## Environment Configuration

**ELI Integration (Optional):**

To enable "Send to ELI" functionality for external case management, set these environment variables:

```bash
ELI_BASE_URL=https://ajmaksimeli.com
ELI_INGEST_TOKEN=<your-eli-token>
```

**In Replit:**
- **Development**: Project → Secrets → Add the variables above
- **Production**: Deployments → [Your Deployment] → Secrets/Env → Add the variables above

Without these secrets, the "Send to ELI" button will show a configuration error.

## Quick Start

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5000`.

## Usage Example

1. Upload a fixed evidence artifact (PDF, document, etc.)
2. Select an interpretive lens (legal, technical, operational)
3. View how conclusions change under different frameworks
4. Export tamper-evident audit trail

See `/demos/evidence-walkthrough` for a complete walkthrough.

## Security & Chain-of-Custody

### Encryption at Rest

All source documents are encrypted using **AES-256-GCM** (authenticated encryption):
- 256-bit keys derived from `LANTERN_VAULT_KEY`
- 96-bit random IVs per operation
- 128-bit authentication tags for integrity
- Fail-closed: Server rejects startup without encryption key in production

### Chain-of-Custody Guarantees

**What Lantern guarantees:**
- ✅ Cryptographic integrity (SHA-256 hashing)
- ✅ Tamper-evident audit trails (append-only ledger)
- ✅ Deterministic verification (canonical JSON hashing)
- ✅ Complete custody history (timestamped operations)

**What Lantern does NOT guarantee:**
- ❌ Document authenticity (cannot detect pre-ingestion forgery)
- ❌ Legal admissibility (depends on jurisdiction)
- ❌ Deep fake detection

**Verification:**
```bash
# Verify case integrity
curl -X GET "http://localhost:5000/api/case/{caseId}/verify"

# Export evidence package
curl -X GET "http://localhost:5000/api/case/{caseId}/export" > evidence.zip
```

**See [docs/CHAIN_OF_CUSTODY_VERIFICATION.md](./docs/CHAIN_OF_CUSTODY_VERIFICATION.md) for complete procedures.**

### Operator Responsibilities

Before using Lantern in legal proceedings:
1. Document evidence provenance (chain from original source)
2. Maintain custody logs (who handled evidence)
3. Export cases regularly (backup and archival)
4. Verify integrity periodically (automated checks)
5. Protect encryption keys (secure key management)

**See [docs/OPERATOR_GUIDE.md](./docs/OPERATOR_GUIDE.md) for court/compliance-ready procedures.**

## Handling Conflicts

When Lantern detects contradictory evidence in your corpus, it flags these as conflicts for analyst review. See [Conflict Resolution Guide](docs/CONFLICT_RESOLUTION_GUIDE.md) for detailed instructions on:

- Understanding conflict types
- Accessing detected conflicts
- Resolution workflow and best practices
- Examples of common conflict scenarios

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

## Technical Stack

**Frontend:**
- React 19, TypeScript, Vite
- Radix UI components with Tailwind CSS
- TanStack Query for data fetching
- IndexedDB for local caching

**Backend:**
- Node.js 20+ with Express
- PostgreSQL 16+ (System of Record)
- Drizzle ORM for database access
- AES-256-GCM encryption (crypto module)

**Security:**
- Encrypted source storage (AES-256-GCM)
- SHA-256 hashing for integrity
- Append-only ledger (tamper-evident)
- RBAC with Passport.js authentication

**Deployment:**
- Docker + Docker Compose
- Multi-stage builds (optimized images)
- Health checks and auto-restart
- Volume persistence for data

**Architecture:**
- **Storage Layer**: PostgreSQL (cases, sources, claims, ledger)
- **Encryption Layer**: At-rest AES-256-GCM with key derivation
- **API Layer**: Express REST endpoints with RBAC
- **UI Layer**: React SPA with local caching
- **Export Layer**: ZIP bundles with complete evidence packages

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
| `npm run db:push` | Push database schema changes |

## Documentation

Comprehensive guides for deployment, operation, and legal compliance:

| Document | Description |
|----------|-------------|
| [DOCKER_DEPLOY.md](./docs/DOCKER_DEPLOY.md) | Complete Docker deployment guide with security setup |
| [OPERATOR_GUIDE.md](./docs/OPERATOR_GUIDE.md) | Court/compliance-ready operational procedures (20KB+) |
| [CHAIN_OF_CUSTODY_VERIFICATION.md](./docs/CHAIN_OF_CUSTODY_VERIFICATION.md) | Step-by-step verification procedures with scripts |
| [REPLIT_SETUP.md](./REPLIT_SETUP.md) | Quick start guide for Replit deployment |
| [SECURITY.md](./SECURITY.md) | Security model and threat analysis |
| [CONFLICT_RESOLUTION_GUIDE.md](./docs/CONFLICT_RESOLUTION_GUIDE.md) | Handling contradictory evidence |

**Key topics covered:**
- Threat model (what Lantern detects vs. doesn't detect)
- Chain-of-custody technical implementation
- Export/import evidence packages
- Retention and no-delete policy
- Audit verification procedures (automated scripts)
- Legal considerations and admissibility requirements
- Operator responsibilities and best practices

## Collaboration

Open to technical collaboration on:
- Cryptographic verification protocols
- Interpretive framework design
- Audit trail architectures

**Contact**: Available via GitHub Issues or inquiry for HALO-RECEIPTS integration.
