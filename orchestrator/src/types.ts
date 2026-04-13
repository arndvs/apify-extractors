// actors/master-orchestrator/src/types.ts
export type ExtractorKey = 'websiteContentCrawler' | 'color' | 'policy' | 'contact' | 'faq' | 'product';


export interface ExtractorResult {
    success: boolean;
    data: unknown;
    error?: string;
    metadata: {
        startTime: string;
        endTime: string;
        duration: number;
        datasetId?: string;
        scrapingStrategy?: ScrapingStrategy;
    };
}


export interface ExtractorConfig {
    actorId: string;
    enabled: boolean;
    priority: number;
    dependsOn?: string[];
    inputTransform?: (url: string, websiteInfo: WebsiteInfo) => Record<string, any>;
}


export interface ExtractorsConfig {
    [key: string]: boolean;
}


export interface CommonInput {
    url: string;
    maxTimeout?: number;
    retryCount?: number;
    proxyConfiguration?: {
        useApifyProxy?: boolean;
        proxyUrls?: string[];
    };
    extractors?: ExtractorsConfig;
}

export interface OrchestratorInput {
    url: string;
    maxTimeout: number;
    retryCount?: number;
    webhookUrl?: string;
    proxyConfiguration?: {
        useApifyProxy?: boolean;
        proxyUrls?: string[];
    };
    extractors?: {
        websiteContentCrawler?: boolean;
        color?: boolean;
        policy?: boolean;
        contact?: boolean;
        faq?: boolean;
        product?: boolean;
    };
}

// export interface WebsiteInfo {
//     isValid: boolean;
//     url: string;
//     error?: string;
//     platform?: {
//         name: string;
//         confidence: number;
//         indicators: string[];
//     };
//     contentType?: string;
// }

export interface PlatformSignature {
    patterns: RegExp[];
    meta?: string[];
}


export enum ScrapingStrategy {
    BASIC_HTTP = 'basic_http',      // Simple Axios requests
    GOT_SCRAPING = 'got_scraping',  // Got-scraping with anti-detection
    CHEERIO = 'cheerio',            // Cheerio for HTML parsing
    PUPPETEER = 'puppeteer',        // Crawlee + Puppeteer
    PLAYWRIGHT = 'playwright',       // Crawlee + Playwright
    TEST_RUNNER = 'test_runner'     // Playwright Test Runner
}

export interface ScrapingRequirements {
    needsJavaScript: boolean;       // Does the site require JS rendering?
    isAntiBot: boolean;            // Are there anti-bot measures?
    isDynamic: boolean;            // Is content dynamically loaded?
    needsInteraction: boolean;     // Requires clicking/scrolling/etc?
    complexWorkflow: boolean;      // Needs complex interaction patterns?
}

export interface PlatformInfo {
    name: string;
    confidence: number;
    indicators: string[];
    scrapingStrategy: ScrapingStrategy;
    requirements: ScrapingRequirements;
}

export interface WebsiteInfo {
    isValid: boolean;
    url: string;
    error?: string;
    platform?: PlatformInfo;
    contentType?: string;
}


export interface ExtendedPerformance extends Performance {
    memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
    };
}


export interface LaunchContext {
    launchOptions: {
        args?: string[];
        [key: string]: any;
    };
}
