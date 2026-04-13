# Policy Extractor

This Apify actor extracts legal policies and documents from websites. It identifies and collects URLs for:
- Privacy Policies
- Terms of Service
- Cookie Policies
- Return/Refund Policies
- Legal Disclaimers

## Features

- Intelligent policy detection using pattern matching
- Confidence scoring for each detected policy
- Supports both static and dynamic websites
- Automatic strategy selection based on website type
- Comprehensive metadata and context collection

## Input

```json
{
    "url": "https://example.com",
    "maxTimeout": 30,
    "scrapingStrategy": "CHEERIO"
}
```

| Field | Type | Description |
|-------|------|-------------|
| url | string | The website URL to extract policies from |
| maxTimeout | number | Maximum time (in seconds) to wait for page load |
| scrapingStrategy | string | Scraping strategy to use (CHEERIO, PLAYWRIGHT, etc.) |

## Output

```json
{
    "sourceUrl": "https://example.com",
    "extractedAt": "2024-02-05T12:00:00.000Z",
    "policies": [
        {
            "type": "privacyPolicy",
            "url": "https://example.com/privacy",
            "confidence": 0.9,
            "linkText": "Privacy Policy",
            "context": "Footer navigation"
        }
    ],
    "metadata": {
        "totalFound": 1,
        "types": {
            "privacyPolicy": 1
        },
        "strategy": "CHEERIO"
    }
}
```

## Usage

1. Input Configuration:
   - Provide the target website URL
   - Optionally adjust timeout and strategy

2. Running the Actor:
   - Use Apify Console
   - Via API
   - Integration with other systems

## Performance Considerations

- Uses Cheerio by default for better performance
- Falls back to Playwright for dynamic content
- Configurable timeouts and retries
