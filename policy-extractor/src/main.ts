import { Actor, log } from 'apify';
import { PlaywrightCrawler, CheerioCrawler, Dataset } from 'crawlee';
import { URL } from 'url';
import { PolicyExtractor } from './policy-extractor.js';
import { Input, ScrapingStrategy } from './types.js';

// Configure structured logging
const logger = {
    info: (message: string, data?: any) => {
        const timestamp = new Date().toISOString();
        log.info('PolicyExtractor', {
            timestamp,
            message,
            ...data && { data }
        });
    },
    error: (message: string, error: any) => {
        const timestamp = new Date().toISOString();
        log.error('PolicyExtractor', {
            timestamp,
            message,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            }
        });
    },
    debug: (message: string, data?: any) => {
        const timestamp = new Date().toISOString();
        log.debug('PolicyExtractor', {
            timestamp,
            message,
            ...data && { data }
        });
    }
};

async function processPolicies(policies: any[], baseUrl: string, request: any, scrapingStrategy: ScrapingStrategy) {
    // Resolve relative URLs to absolute
    policies.forEach(policy => {
        try {
            policy.url = new URL(policy.url, baseUrl).href;
        } catch (e) {
            logger.debug(`Invalid URL skipped`, { url: policy.url, error: (e as Error).message });
        }
    });

    const metadata = {
        totalFound: policies.length,
        types: policies.reduce((acc, policy) => {
            acc[policy.type] = (acc[policy.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        strategy: scrapingStrategy
    };

    logger.info('Policies extracted successfully', {
        sourceUrl: request.url,
        policyCount: policies.length,
        typeBreakdown: metadata.types
    });

    await Dataset.pushData({
        sourceUrl: request.url,
        extractedAt: new Date().toISOString(),
        policies,
        metadata
    });
}

// Actor entry point
await Actor.init();
logger.info('Actor initialized');

try {
    const input = await Actor.getInput<Input>();
    if (!input?.url) {
        throw new Error('URL is required');
    }

    logger.info('Input validated', {
        url: input.url,
        strategy: input.scrapingStrategy,
        timeout: input.maxTimeout
    });

    const {
        url,
        maxTimeout = 30,
        scrapingStrategy = ScrapingStrategy.CHEERIO
    } = input;

    const baseUrl = new URL(url).origin;
    const policyExtractor = new PolicyExtractor();

    const commonConfig = {
        maxRequestsPerCrawl: 1,
        navigationTimeoutSecs: maxTimeout,
        requestHandlerTimeoutSecs: maxTimeout,
        maxRequestRetries: 2
    };

    logger.debug('Crawler configuration prepared', commonConfig);

    if ([ScrapingStrategy.CHEERIO, ScrapingStrategy.BASIC_HTTP, ScrapingStrategy.GOT_SCRAPING].includes(scrapingStrategy)) {
        logger.info('Using CheerioCrawler for static content extraction');

        const crawler = new CheerioCrawler({
            ...commonConfig,
            requestHandler: async ({ $, request }) => {
                try {
                    logger.debug('Starting Cheerio extraction', { url: request.url });
                    // @ts-ignore
                    const policies = await policyExtractor.findPoliciesCheerio($);
                    await processPolicies(policies, baseUrl, request, scrapingStrategy);
                } catch (error) {
                    logger.error('Cheerio extraction failed', error);
                    throw error;
                }
            }
        });

        await crawler.run([url]);
    } else {
        logger.info('Using PlaywrightCrawler for dynamic content extraction');

        const crawler = new PlaywrightCrawler({
            ...commonConfig,
            requestHandler: async ({ page, request }) => {
                try {
                    logger.debug('Starting Playwright extraction', { url: request.url });
                    const policies = await policyExtractor.findPoliciesPlaywright(page);
                    await processPolicies(policies, baseUrl, request, scrapingStrategy);
                } catch (error) {
                    logger.error('Playwright extraction failed', error);
                    throw error;
                }
            },
            browserPoolOptions: {
                useFingerprints: true
            },
            launchContext: {
                launchOptions: {
                    args: [
                        '--disable-gpu',
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage'
                    ]
                }
            }
        });

        await crawler.run([url]);
    }

    logger.info('Extraction completed successfully', {
        url,
        strategy: scrapingStrategy
    });

} catch (error) {
    logger.error('Actor execution failed', error);
    throw error;
} finally {
    logger.info('Actor shutting down');
    await Actor.exit();
}
