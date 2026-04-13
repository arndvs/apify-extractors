# Master Orchestrator Actor

Coordinates the execution of website content extractors. This actor manages the parallel execution of specialized extractors while handling timeouts, retries, and result aggregation.

## Features

- 🔍 Automatic platform detection (WordPress, React, Next.js, etc.)
- 🌐 Website validation and accessibility checks
- 🎯 Selective extractor execution
- ⚡ Parallel processing
- 🔄 Automatic retries
- 🕒 Configurable timeouts
- 📊 Result aggregation
- 🪝 Webhook support

## Input

```typescript
interface OrchestratorInput {
  url: string; // Website URL to analyze
  maxTimeout?: number; // Maximum execution time (seconds)
  retryCount?: number; // Number of retry attempts
  webhookUrl?: string; // Optional webhook for results
  proxyConfiguration?: {
    // Optional proxy settings
    useApifyProxy?: boolean;
    proxyUrls?: string[];
  };
  extractors?: {
    // Enable/disable specific extractors
    color?: boolean;
    policy?: boolean;
    contact?: boolean;
    faq?: boolean;
    product?: boolean;
  };
}
```

### Example Input

```json
{
  "url": "https://example.com",
  "maxTimeout": 60,
  "retryCount": 3,
  "extractors": {
    "color": true,
    "policy": true
  },
  "webhookUrl": "https://api.example.com/webhook"
}
```

## Output

```typescript
interface OrchestratorOutput {
  url: string;
  extractedAt: string;
  websiteInfo: {
    isValid: boolean;
    platform?: {
      name: string; // e.g., 'wordpress', 'nextjs_react', 'vanilla_html'
      confidence: number; // 0 to 1 confidence score
      indicators: string[]; // List of detected platform indicators
    };
    error?: string; // Present if website is invalid
  };
  results: {
    [extractorName: string]: {
      success: boolean;
      data: unknown;
      metadata: {
        startTime: string;
        endTime: string;
        duration: number;
        datasetId?: string;
      };
    };
  };
  metadata: {
    successCount: number;
    totalCount: number;
  };
}
```

### Example Output

```json
{
    "url": "https://example.com",
    "extractedAt": "2024-01-31T12:00:00.000Z",
    "websiteInfo": {
        "isValid": true,
        "platform": {
            "name": "wordpress",
            "confidence": 0.85,
            "indicators": [
                "HTML match: wp-content",
                "Meta tag match: generator (in content)",
                "Script match: wp-includes"
            ]
        }
    },
    "results": {
        "color": {
            "success": true,
            "data": {
                "primary": "#1a73e8",
                "secondary": "#4285f4",
                "accent": ["#34a853", "#fbbc05"],
                "palette": [...]
            },
            "metadata": {
                "startTime": "2024-01-31T12:00:00.000Z",
                "endTime": "2024-01-31T12:00:10.000Z",
                "duration": 10000,
                "datasetId": "dataset_id"
            }
        },
        "policy": {
            "success": true,
            "data": [...],
            "metadata": {...}
        }
    },
    "metadata": {
        "successCount": 2,
        "totalCount": 2
    }
}
```

## Supported Platforms

The orchestrator can detect various web platforms and frameworks including:

### Content Management Systems

- WordPress
- Shopify
- Wix
- Squarespace

### JavaScript Frameworks

- React
- Next.js
- Gatsby
- Vue.js
- Angular

### Website Builders

- Webflow
- Bubble

The platform detection provides confidence scores and specific indicators for why a platform was detected. This information helps downstream extractors optimize their strategies based on the website's technology stack.

## Usage

### Via Apify Console

1. Navigate to the actor in Apify Console
2. Click "Run"
3. Configure input parameters
4. Start the run

### Via API

```typescript
import { Actor } from "apify";

await Actor.call("your-username/master-orchestrator", {
  url: "https://example.com",
  extractors: {
    color: true,
    policy: true,
  },
});
```

## Local Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run develop

# Build
npm run build

# Deploy to Apify
apify push
```

## Environment Variables

- `NODE_ENV`: Set to 'development' for local testing
- `APIFY_TOKEN`: Your Apify API token
- `APIFY_PROXY_PASSWORD`: If using Apify proxy

## Error Handling

The orchestrator implements several error handling strategies:

1. **Website Validation**: Checks URL format and website accessibility
2. **Platform Detection**: Falls back to 'vanilla_html' if no specific platform is detected
3. **Retries**: Failed extractions are retried based on `retryCount`
4. **Timeouts**: Extractions are limited by `maxTimeout`
5. **Partial Results**: Successfully extracted data is saved even if some extractors fail
6. **Validation**: Input and output data is validated

## Webhook Integration

If `webhookUrl` is provided, the orchestrator will POST results to the specified endpoint:

```typescript
POST {webhookUrl}
Content-Type: application/json

{
    // Full extraction results including platform detection
}
```

## Dependencies

- Node.js 18+
- TypeScript 5.0+
- Apify SDK 3.0+
- Got-scraping 4.0+
- Cheerio 1.0+

## Contributing

1. Create a feature branch
2. Make changes
3. Add tests
4. Submit pull request

## License

MIT License — see [LICENSE](../LICENSE) for details.
