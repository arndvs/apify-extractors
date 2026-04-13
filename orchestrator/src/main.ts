// src/main.ts
import { Actor, log } from 'apify';
import { gotScraping } from 'got-scraping';
import { extractorConfigs } from './lib/extractors-config.js';
import { detectPlatform } from './platform-detector.js';
import { ExtractorConfig, ExtractorKey, ExtractorResult, OrchestratorInput, WebsiteInfo } from './types.js';
import { ValidationTools } from './validation.js';

class Orchestrator {
    private readonly extractors = extractorConfigs;

    private results: Map<ExtractorKey, ExtractorResult> = new Map();
    private readonly input: OrchestratorInput;
    private websiteInfo: WebsiteInfo | null = null;


    constructor(input: OrchestratorInput) {
        if (!input) {
            throw new Error('Input is required');
        }

        if (!input.url) {
            throw new Error('URL is required');
        }

        // Set defaults for optional parameters
        this.input = {
            ...input,
            maxTimeout: input.maxTimeout || 60,
            retryCount: input.retryCount || 3,
            extractors: {
                websiteContentCrawler: true,
                color: true,
                policy: true,
                contact: false,
                faq: false,
                product: false,
                ...input.extractors

            }
        };

        this.configureExtractors();

        log.info('Orchestrator initialized with configuration:', {
            url: this.input.url,
            maxTimeout: this.input.maxTimeout,
            retryCount: this.input.retryCount,
            enabledExtractors: Array.from(this.extractors.entries())
                .filter(([_, config]) => config.enabled)
                .map(([name]) => name)
        });
    }

    private configureExtractors(): void {
        for (const [key, extractor] of this.extractors.entries()) {
            const enabled = this.input.extractors?.[key as keyof typeof this.input.extractors] === true;
            extractor.enabled = enabled;
            log.debug(`Configured extractor "${key}": enabled=${enabled}`);
        }
    }

    private async validateWebsite(): Promise<WebsiteInfo> {
        try {
            const url = this.input.url;

            // Validate URL format
            if (!ValidationTools.isValidHttpUrl(url)) {
                return {
                    isValid: false,
                    error: 'Invalid URL format',
                    url: url
                };
            }

            // Initial request with got-scraping
            const response = await gotScraping({
                url: url,
                timeout: {
                    request: this.input.maxTimeout * 1000
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; ApifyExtractors/1.0;)'
                }
            });

            if (response.statusCode !== 200) {
                return {
                    isValid: false,
                    error: `HTTP error: ${response.statusCode}`,
                    url: url
                };
            }

            const contentType = response.headers['content-type'];
            if (!contentType || !contentType.includes('text/html')) {
                return {
                    isValid: false,
                    error: 'Not an HTML website',
                    url: url
                };
            }

            const html = response.body;
            const platformInfo = await detectPlatform(html, url);

            log.info('Website platform and strategy determined:', {
                platform: platformInfo.name,
                confidence: platformInfo.confidence,
                strategy: platformInfo.scrapingStrategy,
                requirements: platformInfo.requirements,
                indicators: platformInfo.indicators
            });

            return {
                isValid: true,
                url: url,
                platform: platformInfo,
                contentType: contentType
            };
        } catch (error) {
            return {
                isValid: false,
                error: error instanceof Error ? error.message : 'Unknown error during validation',
                url: this.input.url
            };
        }
    }

    private async runExtractor(
        extractorKey: ExtractorKey,
        config: ExtractorConfig
    ): Promise<ExtractorResult | null> {
        try {
            log.info(`Starting ${extractorKey} extraction using actor ${config.actorId}...`, {
                platformName: this.websiteInfo?.platform?.name,
                strategy: this.websiteInfo?.platform?.scrapingStrategy
            });

            const startTime = new Date();

            // Transform input if transformer exists, now passing websiteInfo
            const actorInput = config.inputTransform
                ? config.inputTransform(this.input.url, this.websiteInfo!)
                : {
                    url: this.input.url,
                    maxTimeout: this.input.maxTimeout,
                    retryCount: this.input.retryCount,
                    proxyConfiguration: this.input.proxyConfiguration,
                    websiteInfo: this.websiteInfo,
                    scrapingStrategy: this.websiteInfo?.platform?.scrapingStrategy
                };

            const run = await Actor.call(config.actorId, actorInput);

            log.info(`Actor ${config.actorId} called successfully.`);

            const defaultDatasetId = run.defaultDatasetId;
            if (!defaultDatasetId) {
                throw new Error('No dataset ID found in actor run');
            }

            const dataset = await Actor.openDataset(defaultDatasetId);
            const { items } = await dataset.getData();

            const result: ExtractorResult = {
                success: true,
                data: items,
                metadata: {
                    startTime: startTime.toISOString(),
                    endTime: new Date().toISOString(),
                    duration: new Date().getTime() - startTime.getTime(),
                    datasetId: defaultDatasetId,
                    scrapingStrategy: this.websiteInfo?.platform?.scrapingStrategy
                }
            };

            log.info(`${extractorKey} extraction completed successfully`, {
                duration: result.metadata.duration,
                itemCount: items.length,
                strategy: this.websiteInfo?.platform?.scrapingStrategy
            });

            return result;

        } catch (error) {
            log.error(`${extractorKey} extraction failed.`, {
                error: error instanceof Error ? error.message : error,
                strategy: this.websiteInfo?.platform?.scrapingStrategy
            });
            return null;
        }
    }

    private async runPriorityGroup(priority: number): Promise<void> {
        const priorityExtractors = Array.from(this.extractors.entries())
            .filter(([_, config]) => config.enabled && config.priority === priority);

        log.info(`Running extractors for priority ${priority}:`,
            priorityExtractors.map(([key]) => key)
        );

        if (priorityExtractors.length === 0) {
            log.info(`No extractors enabled for priority ${priority}`);
            return;
        }

        const results = await Promise.all(
            priorityExtractors.map(async ([key, config]) => {
                const result = await this.runExtractor(key as ExtractorKey, config);
                return { key, result };
            })
        );

        results.forEach(({ key, result }) => {
            if (result) {
                this.results.set(key, result);
            }
        });
    }

    public async run(): Promise<void> {
        log.info('Starting orchestration...', { url: this.input.url });

        try {
            // First validate website and detect platform
            this.websiteInfo = await this.validateWebsite();

            if (!this.websiteInfo.isValid) {
                await Actor.pushData({
                    url: this.input.url,
                    error: this.websiteInfo.error,
                    status: 'invalid_website'
                });
                return;
            }

            log.info('Website validation successful', {
                platform: this.websiteInfo.platform,
                url: this.websiteInfo.url
            });

            const enabledExtractors = Array.from(this.extractors.entries())
                .filter(([key]) => this.input.extractors?.[key as keyof typeof this.input.extractors] === true);

            log.info('Enabled extractors:',
                enabledExtractors.map(([key]) => key)
            );

            const priorities = new Set(
                enabledExtractors.map(([_, config]) => config.priority)
            );

            for (const priority of Array.from(priorities).sort()) {
                await this.runPriorityGroup(priority);
            }

            const finalResults = {
                url: this.input.url,
                websiteInfo: this.websiteInfo,
                extractedAt: new Date().toISOString(),
                results: Object.fromEntries(this.results),
                metadata: {
                    successCount: Array.from(this.results.values())
                        .filter(result => result.success).length,
                    totalCount: this.results.size
                }
            };

            await Actor.pushData(finalResults);

            if (this.input.webhookUrl) {
                await this.callWebhook(finalResults);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            log.error('Orchestration failed:', { error: errorMessage });
            throw error;
        }
    }

    private async callWebhook(data: unknown): Promise<void> {
        if (!this.input.webhookUrl) return;

        try {
            log.info('Calling webhook...', { url: this.input.webhookUrl });

            const response = await fetch(this.input.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Webhook call failed with status ${response.status}`);
            }

            log.info('Webhook called successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            log.error('Webhook call failed:', { error: errorMessage });
        }
    }
}

declare global {
    interface Window {
        gc?: () => void;
    }
}

// Actor entry point
await Actor.init();

try {
    log.info('Actor starting...');

    let input: OrchestratorInput;
    if (process.env.NODE_ENV === 'development') {
        log.info('Running in development mode with mock input');
        input = {
            url: 'https://example.com',
            extractors: {
                color: true,
                policy: true,
            },
            maxTimeout: 60,
            retryCount: 3
        };
    } else {
        log.info('Getting input from Actor...');
        const retrievedInput = await Actor.getInput<OrchestratorInput>();
        if (!retrievedInput) {
            throw new Error('No input provided');
        }
        input = retrievedInput;
        log.info('Retrieved input:', { url: input.url, extractors: input.extractors });
    }

    // Validate input
    try {
        ValidationTools.validateInput(input);
        log.info('Input validation passed');
    } catch (error) {
        throw new Error(`Invalid input: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Create and run orchestrator
    const orchestrator = new Orchestrator(input);
    log.info('Starting orchestration');
    await orchestrator.run();
    log.info('Orchestration completed successfully');

} catch (error) {
    log.error('Actor failed:', { error: error instanceof Error ? error.message : String(error) });
    throw error;
} finally {
    log.info('Actor shutting down...');
    await Actor.exit();
}
