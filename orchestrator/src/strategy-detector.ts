import { ScrapingStrategy, ScrapingRequirements, PlatformInfo } from './types.js';

interface PlatformConfig {
    name: string;
    defaultStrategy: ScrapingStrategy;
    requirements: ScrapingRequirements;
}

const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
    wordpress: {
        name: 'wordpress',
        defaultStrategy: ScrapingStrategy.GOT_SCRAPING,
        requirements: {
            needsJavaScript: false,
            isAntiBot: false,
            isDynamic: false,
            needsInteraction: false,
            complexWorkflow: false
        }
    },
    shopify: {
        name: 'shopify',
        defaultStrategy: ScrapingStrategy.GOT_SCRAPING,
        requirements: {
            needsJavaScript: true,
            isAntiBot: true,
            isDynamic: true,
            needsInteraction: false,
            complexWorkflow: false
        }
    },
    react: {
        name: 'react',
        defaultStrategy: ScrapingStrategy.PLAYWRIGHT,
        requirements: {
            needsJavaScript: true,
            isAntiBot: false,
            isDynamic: true,
            needsInteraction: true,
            complexWorkflow: false
        }
    },
    nextjs: {
        name: 'nextjs',
        defaultStrategy: ScrapingStrategy.PLAYWRIGHT,
        requirements: {
            needsJavaScript: true,
            isAntiBot: false,
            isDynamic: true,
            needsInteraction: true,
            complexWorkflow: false
        }
    },
    wix: {
        name: 'wix',
        defaultStrategy: ScrapingStrategy.PUPPETEER,
        requirements: {
            needsJavaScript: true,
            isAntiBot: true,
            isDynamic: true,
            needsInteraction: true,
            complexWorkflow: false
        }
    },
    squarespace: {
        name: 'squarespace',
        defaultStrategy: ScrapingStrategy.GOT_SCRAPING,
        requirements: {
            needsJavaScript: false,
            isAntiBot: false,
            isDynamic: false,
            needsInteraction: false,
            complexWorkflow: false
        }
    },
    vanilla_html: {
        name: 'vanilla_html',
        defaultStrategy: ScrapingStrategy.BASIC_HTTP,
        requirements: {
            needsJavaScript: false,
            isAntiBot: false,
            isDynamic: false,
            needsInteraction: false,
            complexWorkflow: false
        }
    }
};

export function determineScrapingStrategy(
    platformName: string,
    indicators: string[]
): { strategy: ScrapingStrategy; requirements: ScrapingRequirements } {
    // Get platform config or default to vanilla_html
    const config = PLATFORM_CONFIGS[platformName] || PLATFORM_CONFIGS.vanilla_html;
    const requirements = { ...config.requirements };

    // Analyze indicators for additional requirements
    const indicatorText = indicators.join(' ').toLowerCase();

    // Check for anti-bot measures
    if (
        indicatorText.includes('captcha') ||
        indicatorText.includes('cloudflare') ||
        indicatorText.includes('protection')
    ) {
        requirements.isAntiBot = true;
    }

    // Check for JavaScript requirements
    if (
        indicatorText.includes('react') ||
        indicatorText.includes('vue') ||
        indicatorText.includes('angular') ||
        indicatorText.includes('dynamic')
    ) {
        requirements.needsJavaScript = true;
        requirements.isDynamic = true;
    }

    // Determine optimal strategy based on requirements
    let strategy = config.defaultStrategy;

    // Override strategy based on requirements
    if (requirements.isAntiBot && !requirements.needsJavaScript) {
        strategy = ScrapingStrategy.GOT_SCRAPING;
    } else if (requirements.isAntiBot && requirements.needsJavaScript) {
        strategy = ScrapingStrategy.PLAYWRIGHT;
    } else if (requirements.needsJavaScript && !requirements.complexWorkflow) {
        strategy = ScrapingStrategy.PUPPETEER;
    } else if (requirements.complexWorkflow || requirements.needsInteraction) {
        strategy = ScrapingStrategy.PLAYWRIGHT;
    } else if (!requirements.needsJavaScript && !requirements.isAntiBot) {
        strategy = ScrapingStrategy.BASIC_HTTP;
    }

    return { strategy, requirements };
}

export function getStrategyCapabilities(strategy: ScrapingStrategy): string[] {
    const capabilities: Record<ScrapingStrategy, string[]> = {
        [ScrapingStrategy.BASIC_HTTP]: [
            'Basic HTTP requests',
            'Fast performance',
            'Low resource usage',
            'Static content only'
        ],
        [ScrapingStrategy.GOT_SCRAPING]: [
            'Anti-detection features',
            'Proxy support',
            'Automatic retries',
            'Rate limiting',
            'Static content only'
        ],
        [ScrapingStrategy.CHEERIO]: [
            'HTML parsing',
            'CSS selector support',
            'Fast performance',
            'Static content only'
        ],
        [ScrapingStrategy.PUPPETEER]: [
            'JavaScript support',
            'Browser automation',
            'Dynamic content',
            'Basic interactions'
        ],
        [ScrapingStrategy.PLAYWRIGHT]: [
            'Modern browser automation',
            'Advanced interactions',
            'Better stability',
            'Anti-bot evasion',
            'Full JavaScript support'
        ],
        [ScrapingStrategy.TEST_RUNNER]: [
            'Testing capabilities',
            'Scenario automation',
            'Advanced reporting',
            'Complex workflows'
        ]
    };

    return capabilities[strategy] || [];
}
