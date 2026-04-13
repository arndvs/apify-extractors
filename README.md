# Apify Extractors

Collection of independent Apify actors for extracting and analyzing website content.

## Architecture

Each extractor is designed as a completely self-contained Apify actor, managed by a master orchestrator. This approach provides:

- 🔒 Complete isolation between extractors
- 🛠️ Independent versioning and deployment
- 🚀 Simplified maintenance and updates
- 📦 No shared dependencies

### Repository Structure

```
apify-extractors/
├── actors/
│   ├── master-orchestrator/      # Coordinates all extractors
│   ├── color-extractor/          # Brand color analysis
│   ├── policy-extractor/         # Legal document extraction
│   ├── contact-extractor/        # Contact info extraction
│   └── ... other extractors
└── docs/                         # Documentation
```

## Available Extractors

| Actor               | Purpose                        | Input                           | Output                                  |
| ------------------- | ------------------------------ | ------------------------------- | --------------------------------------- |
| master-orchestrator | Coordinates extraction process | Website URL, enabled extractors | Combined results from all extractors    |
| color-extractor     | Brand color analysis           | Website URL                     | Primary/secondary colors, color palette |
| policy-extractor    | Legal document collection      | Website URL                     | ToS, Privacy Policy, etc.               |
| contact-extractor   | Business information           | Website URL                     | Contact details, hours, locations       |

## Development

Each actor is developed and maintained independently. To work on an actor:

```bash
# Navigate to actor directory
cd actors/[actor-name]

# Install dependencies
npm install

# Run locally
npm run dev

# Build
npm run build

# Deploy to Apify
apify push
```

### Creating a New Extractor

1. Create a new directory in `actors/`
2. Copy the basic actor template
3. Implement the extraction logic
4. Add actor configuration to master-orchestrator
5. Deploy independently to Apify

## Deployment

Each actor is deployed separately to Apify:

```bash
# Deploy specific actor
cd actors/[actor-name]
apify push

# Deploy master orchestrator
cd actors/master-orchestrator
apify push
```

## Integration

### Using the Master Orchestrator

```typescript
const run = await Actor.call("your-username/master-orchestrator", {
  url: "https://example.com",
  extractors: {
    color: true,
    policy: true,
    contact: false,
  },
  maxTimeout: 60,
  retryCount: 3,
});
```

### Direct Actor Access

Each extractor can also be called independently:

```typescript
const run = await Actor.call("your-username/color-extractor", {
  url: "https://example.com",
  maxTimeout: 30,
});
```

## Contributing

1. Create a new branch for your changes
2. Make changes in relevant actor directory
3. Test locally using `npm run dev`
4. Submit a pull request
5. Deploy to Apify after approval

## Local Development

Each actor includes its own development environment:

```bash
# Set up local environment
export APIFY_TOKEN=your_token

# Run actor locally
cd actors/[actor-name]
npm run dev
```

## Testing

Tests are maintained at the actor level:

```bash
# Run tests for specific actor
cd actors/[actor-name]
npm test
```

## Monitoring

Monitor actors through:

- Apify Console
- Actor-specific logs
- Master orchestrator execution logs

## Support

- Issues: [Open a GitHub issue](https://github.com/arndvs/apify-extractors/issues)
- Documentation: See actor-specific README files
