export enum ScrapingStrategy {
    BASIC_HTTP = 'BASIC_HTTP',
    GOT_SCRAPING = 'GOT_SCRAPING',
    CHEERIO = 'CHEERIO',
    PUPPETEER = 'PUPPETEER',
    PLAYWRIGHT = 'PLAYWRIGHT',
    TEST_RUNNER = 'TEST_RUNNER'
}

export interface PolicyMatch {
    type: string;
    url: string;
    confidence: number;
    linkText: string;
    context?: string;
}

export interface Input {
    url: string;
    maxTimeout?: number;
    scrapingStrategy?: ScrapingStrategy;
}
