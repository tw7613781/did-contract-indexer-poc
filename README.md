# DID Contract Indexer POC

DID Contract Indexer Proof of Concept - A TypeScript-based indexer for DID smart contracts.

## Features

- 🚀 **Efficient Multicall**: Uses contract's `multicall` function to batch RPC calls
- 📊 **Progress Tracking**: Real-time progress updates during indexing
- 🔄 **Retry Logic**: Automatic retry with exponential backoff
- 🎯 **Concurrent Processing**: Configurable concurrency for faster indexing
- 💾 **JSON Export**: Exports indexed data with statistics
- 🔗 **Subdomain Relations**: Automatically builds parent-child relationships

## Prerequisites

- Node.js >= 18.x
- npm or yarn or pnpm
- An RPC endpoint URL (e.g., Infura, Alchemy, or local node)

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the project root:

```bash
# RPC endpoint URL
RPC_URL=https://your-rpc-endpoint.com

# DID Contract address
CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000

# Batch size for multicall (default: 500)
BATCH_SIZE=500

# Number of concurrent batch requests (default: 5)
CONCURRENCY=5

# Number of retry attempts (default: 3)
RETRY_ATTEMPTS=3

# Output file path (optional, default: domains.json)
OUTPUT_FILE=domains.json
```

## Usage

### Run the Indexer

```bash
npm run index
```

This will:
1. Connect to the DID contract via RPC
2. Fetch all domain data using optimized multicall batches
3. Build subdomain relationships
4. Export results to `domains.json`
5. Display statistics and sample data

### Expected Output

```
⚙️  Configuration:
   RPC URL: https://your-rpc-endpoint.com
   Contract: 0x...
   Batch Size: 500
   Concurrency: 5

🚀 Starting DID Contract indexing...
📊 Total domains: 4000

🔍 Stage 1: Fetching token IDs...
  Progress: 4000/4000 (100%)
✅ Fetched 4000 token IDs

🔍 Stage 2: Fetching domain details...
  Progress: 4000/4000 (100%)
✅ Fetched 4000 domain details

🔗 Stage 3: Building subdomain relationships...
✅ Completed indexing

📊 Indexing Summary:
   Total domains: 4000
   Top-level domains: 3500
   Subdomains: 500
   Domains with DID: 3800
   Domains allowing subdomains: 2000

⏱️  Time taken: 12.34 seconds
💾 Exported to: domains.json
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## Performance

For a contract with **4000 domains**, the indexer:
- Makes **~25 RPC calls** (vs 12,000 without optimization)
- Completes in **~10-15 seconds** (depending on network)
- Reduces RPC calls by **99.8%**

### Optimization Strategy

1. **Stage 1**: Batch fetch token IDs
   - `totalSupply()` → 1 call
   - `multicall([tokenByIndex(0), ..., tokenByIndex(499)])` → 8 calls for 4000 tokens

2. **Stage 2**: Batch fetch details
   - `multicall([getMetadata(id), ownerOf(id), ...])` → 16 calls for 4000 domains

3. **Stage 3**: Build subdomain relationships locally

## Output Format

The exported JSON contains:

```json
{
  "timestamp": "2025-11-04T...",
  "config": {
    "rpcUrl": "...",
    "contractAddress": "..."
  },
  "statistics": {
    "total": 4000,
    "topLevel": 3500,
    "subdomains": 500,
    "withDID": 3800,
    "allowingSubdomains": 2000
  },
  "duration": 12.34,
  "domains": [
    {
      "id": "12345",
      "name": "example.domain",
      "did": "did:example:...",
      "note": "...",
      "allowSubdomain": true,
      "owner": "0x...",
      "subdomains": ["sub1.example.domain", "sub2.example.domain"]
    }
  ]
}
```

## Project Structure

```
.
├── src/
│   ├── abi/
│   │   └── olaresdid.json      # Contract ABI
│   ├── DIDIndexer.ts           # Core indexer class
│   ├── indexer.ts              # Main execution script
│   ├── types.ts                # TypeScript interfaces
│   └── index.ts                # Entry point
├── dist/                        # Compiled output (generated)
├── .env                         # Configuration (create this)
├── package.json                 # Project dependencies
├── tsconfig.json                # TypeScript configuration
└── README.md                    # This file
```

## Troubleshooting

### RPC Rate Limiting

If you encounter rate limiting:
- Reduce `BATCH_SIZE` (e.g., from 500 to 250)
- Reduce `CONCURRENCY` (e.g., from 5 to 2)
- Add delays between batches (modify `DIDIndexer.ts`)

### Out of Memory

For very large datasets:
- Process in smaller chunks
- Stream results instead of keeping everything in memory

### Network Timeouts

- Increase `RETRY_ATTEMPTS`
- Check your RPC endpoint's timeout settings

## License

MIT

