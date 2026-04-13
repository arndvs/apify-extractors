// src/config/extractors.ts
import { ExtractorConfig, ExtractorKey, WebsiteInfo, ScrapingStrategy, LaunchContext } from '../types.js';
import { log } from 'apify';
import { Page } from 'playwright';
import { Request } from 'crawlee';

const getDomain = (url: string): string => {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch (e) {
        log.debug('Error parsing URL:', { url, error: e });
        return '';
    }
};

const getCrawlerType = (strategy: ScrapingStrategy): string => {
    const type = (() => {
        switch (strategy) {
            case ScrapingStrategy.BASIC_HTTP:
                return 'cheerio';
            case ScrapingStrategy.GOT_SCRAPING:
                return 'cheerio';
            case ScrapingStrategy.CHEERIO:
                return 'cheerio';
            case ScrapingStrategy.PUPPETEER:
            case ScrapingStrategy.PLAYWRIGHT:
                return 'playwright:adaptive';
            case ScrapingStrategy.TEST_RUNNER:
                return 'playwright:chrome';
            default:
                return 'playwright:adaptive';
        }
    })();

    log.debug('Crawler type selection:', {
        strategy,
        selectedType: type,
        reason: `Based on platform strategy: ${strategy}`
    });

    return type;
};

const getProxyConfiguration = (websiteInfo: WebsiteInfo) => {
    const platform = websiteInfo?.platform?.name;
    const requirements = websiteInfo?.platform?.requirements;

    const proxyConfig = {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'] as string[],
        apifyProxyCountry: 'US'
    };

    if (platform === 'shopify' || requirements?.isAntiBot) {
        proxyConfig.apifyProxyGroups = ['RESIDENTIAL'];
        log.debug('Using residential proxies for anti-bot protection', {
            platform,
            isAntiBot: requirements?.isAntiBot
        });
    } else if (requirements?.needsJavaScript) {
        proxyConfig.apifyProxyGroups = ['StaticUS3'];
        log.debug('Using datacenter proxies for JavaScript rendering', {
            platform,
            needsJavaScript: requirements?.needsJavaScript
        });
    }

    log.info('Final proxy configuration:', proxyConfig);
    return proxyConfig;
};

const getCookieConfig = (url: string, websiteInfo: WebsiteInfo) => {
    // Simplified cookie handling - only set essential cookies for the target domain
    const domain = getDomain(url);
    const simpleCookie = {
        name: 'cookie_consent_all',
        value: 'accepted',
        domain: domain,
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
        secure: false, // Allow both HTTP and HTTPS
        sameSite: 'Lax' as const // Less restrictive
    };

    const cookieConfig = {
        initialCookies: [simpleCookie],
        // Only block tracking domains that might slow down the crawl
        blockCookieDomains: [
            'analytics',
            'tracking',
            'stats',
            'pixel',
            'metrics'
        ]
    };

    log.debug('Cookie configuration:', {
        domain,
        cookieCount: cookieConfig.initialCookies.length,
        cookies: cookieConfig.initialCookies
    });

    return cookieConfig;
};

const getPerformanceConfig = (websiteInfo: WebsiteInfo) => {
    const platform = websiteInfo?.platform?.name;
    const requirements = websiteInfo?.platform?.requirements;

    const config = {
        navigationTimeoutSecs: 15,        // More aggressive timeout
        requestTimeoutSecs: 15,           // More aggressive timeout
        dynamicContentWaitSecs: 2,        // Minimal wait time
        maxConcurrency: 1,
        maxRequestRetries: 1,
        maxMemoryMb: 2048,               // Reduced memory usage
        diskCacheDir: '/tmp/crawler-cache',
        maxRequestsPerCrawl: 1,          // Ensure we only get one page
        maxCrawlingDepth: 0,             // Don't follow links
        sameDomainDelaySecs: 0.1,        // Minimal delay between requests
        pageCacheSize: 1,                // Minimal cache
        maxUsageCount: 1                 // Don't reuse sessions
    };

    if (platform === 'shopify') {
        config.navigationTimeoutSecs = 120;
        config.dynamicContentWaitSecs = 15;
        log.debug('Applied Shopify-specific performance config');
    } else if (!requirements?.needsJavaScript && !requirements?.isAntiBot) {
        config.navigationTimeoutSecs = 60;
        config.requestTimeoutSecs = 60;
        config.dynamicContentWaitSecs = 5;
        config.maxConcurrency = 2;
        log.debug('Applied fast configuration for simple site');
    }

    log.info('Performance configuration:', config);
    return config;
};

export const extractorConfigs: Map<ExtractorKey, ExtractorConfig> = new Map([
    ['websiteContentCrawler', {
        actorId: 'apify/website-content-crawler',
        enabled: true,
        priority: 1,
        inputTransform: (url: string, websiteInfo: WebsiteInfo) => {
            const crawlerType = 'cheerio';
            // const crawlerType = getCrawlerType(websiteInfo?.platform?.scrapingStrategy || ScrapingStrategy.PUPPETEER);
            const performanceConfig = getPerformanceConfig(websiteInfo);
            const cookieConfig = getCookieConfig(url, websiteInfo);

            log.info('Crawler configuration:', {
                detectedStrategy: websiteInfo?.platform?.scrapingStrategy,
                mappedCrawlerType: crawlerType,
                platform: websiteInfo?.platform?.name,
                requirements: websiteInfo?.platform?.requirements
            });

            return {
                startUrls: [{ url }],
                aggressivePrune: false,
                clickElementsCssSelector: '[aria-expanded="false"]',
                clientSideMinChangePercentage: 15,
                crawlerType,
                debugLog: true,
                debugMode: true,
                expandIframes: true,
                ignoreCanonicalUrl: false,
                maxCrawlDepth: 0,
                maxCrawlPages: 1,
                proxyConfiguration: getProxyConfiguration(websiteInfo),
                ...performanceConfig,
                ...cookieConfig,
                readableTextCharThreshold: 100,
                removeCookieWarnings: true,
                removeElementsCssSelector: 'script, style, noscript, svg,[role="alert"],[role="banner"],[role="dialog"],[role="alertdialog"],[role="region"][aria-label*="skip" i],[aria-modal="true"]',
                renderingTypeDetectionPercentage: 10,
                saveFiles: false,
                saveHtml: false,
                saveHtmlAsFile: true,
                saveMarkdown: true,
                saveScreenshots: false,
                useSitemaps: false,
                includeUrlGlobs: [],
                excludeUrlGlobs: [],
                initialConcurrency: 1,
                maxSessionRotations: 3,
                minFileDownloadSpeedKBps: 50,
                maxScrollHeightPixels: 5000,
                htmlTransformer: 'none',
                maxResults: 9999999,
                browserPoolOptions: {
                    useFingerprints: true,
                    fingerprintOptions: {
                        generate: true,
                        randomFingerprints: 1
                    },
                    preLaunchHooks: [(pageId: string, launchContext: LaunchContext) => {
                        log.debug('Pre-launch hook executing', { pageId });
                        const options = launchContext.launchOptions;
                        options.args = [...(options.args || []),
                            '--disk-cache-dir=/tmp/browser-cache',
                            '--disk-cache-size=104857600',
                            '--media-cache-size=104857600',
                            '--aggressive-cache-discard',
                            '--enable-gpu-rasterization',
                            '--enable-zero-copy',
                            '--enable-features=NetworkServiceInProcess',
                            '--js-flags="--max-old-space-size=4096"'
                        ];
                        return options;
                    }]
                },
                launchContext: {
                    launchOptions: {
                        headless: true,
                        args: [
                            '--no-sandbox',
                            '--disable-setuid-sandbox',
                            '--disable-dev-shm-usage',
                            '--disable-accelerated-2d-canvas',
                            '--disable-gpu',
                            '--window-size=1280,720',  // Reduced window size
                            '--disable-web-security',
                            '--disable-features=IsolateOrigins',
                            '--no-first-run',
                            '--no-zygote',
                            '--disable-setuid-sandbox',
                            '--disable-dev-shm-usage',
                            '--disable-notifications',
                            '--disable-background-timer-throttling',
                            '--js-flags="--max-old-space-size=512"'  // Limit JS memory
                        ]
                    }
                },
                sessionPoolOptions: {
                    sessionOptions: {
                        maxUsageCount: 3
                    },
                    maxPoolSize: 1,
                    persistStateKeyValueStoreId: 'SESSION_STORE',
                    persistStateKey: `${getDomain(url)}_session_state`
                },
                navigationTimeoutSecs: performanceConfig.navigationTimeoutSecs,
                pageLoadTimeoutSecs: performanceConfig.navigationTimeoutSecs,
                requestHandlerTimeoutSecs: performanceConfig.requestTimeoutSecs,
                handlePageTimeoutSecs: performanceConfig.requestTimeoutSecs,
                postNavigationHooks: [
                    async ({ page, request }: { page: Page; request: Request }) => {
                        await page.evaluate(() => {
                            const performance = window.performance as any;
                            if (performance?.memory) {
                                if ((window as any).gc) (window as any).gc();
                            }
                            const selectors = [
                                'iframe:not([src*="youtube"]):not([src*="vimeo"])',
                                'script:not([src*="shopify"]):not([src*="analytics"])',
                                'link[rel="prefetch"]',
                                'link[rel="prerender"]',
                            ];
                            selectors.forEach(selector => {
                                document.querySelectorAll(selector).forEach(el => el.remove());
                            });
                        });
                        log.debug('Post-navigation hook completed', { url: request.url });
                    }
                ]
            };
        }
    }],
    ['color', {
        actorId: 'arndvs/ripe-color-extractor',
        enabled: true,
        priority: 1
    }],
    ['policy', {
        actorId: 'arndvs/ripe-policy-extractor',
        enabled: true,
        priority: 1
    }],

    ['contact', {
        actorId: 'arndvs/ripe-extractor---contact',
        enabled: false,
        priority: 1
    }],
    ['faq', {
        actorId: 'arndvs/ripe-extractor---faq',
        enabled: false,
        priority: 2
    }],
    ['product', {
        actorId: 'arndvs/ripe-extractor---product',
        enabled: false,
        priority: 2
    }]
]);
