import type { CheerioAPI } from 'cheerio';
import type { ElementHandle, Page } from 'playwright';
import { PolicyMatch } from './types';
import { createLogger } from './lib/logger';


export class PolicyExtractor {
    private readonly logger = createLogger('PolicyExtractor');
    private readonly policyPatterns = {
        privacyPolicy: [
            /privacy[- ]?policy/i,
            /privacy[- ]?notice/i,
            /data[- ]?protection/i,
            /privacy[- ]?statement/i,
            /privacy[- ]?information/i
        ],
        termsOfService: [
            /terms[- ]?(of[- ]?service|and[- ]?conditions)/i,
            /terms[- ]?of[- ]?use/i,
            /legal[- ]?terms/i,
            /conditions[- ]?of[- ]?use/i,
            /user[- ]?agreement/i
        ],
        cookiePolicy: [
            /cookie[- ]?policy/i,
            /cookie[- ]?notice/i,
            /cookie[- ]?statement/i,
            /cookie[- ]?preferences/i
        ],
        returnPolicy: [
            /return[- ]?policy/i,
            /refund[- ]?policy/i,
            /shipping[- ]?policy/i,
            /returns[- ]?and[- ]?exchanges/i
        ],
        disclaimer: [
            /disclaimer/i,
            /legal[- ]?notice/i,
            /legal[- ]?disclaimer/i
        ]
    };

    private readonly commonLocations = [
        'footer',
        '[role="contentinfo"]',
        '.footer',
        '#footer',
        '.bottom',
        '.legal',
        '.policies',
        'header',
        '.header',
        '#header',
        '[role="banner"]'
    ];

    async findPoliciesCheerio($: CheerioAPI): Promise<PolicyMatch[]> {
        this.logger.debug('Starting Cheerio policy extraction');
        const policies: PolicyMatch[] = [];

        // Search in common locations first
        for (const location of this.commonLocations) {
            this.logger.debug('Searching common location', { location });
            $(location + ' a').each((_, element) => {
                const match = this.analyzePolicyLinkCheerio($(element));
                if (match) policies.push(match);
            });
        }

        // Search all links as fallback
        this.logger.debug('Starting fallback search in all links');
        $('a').each((_, element) => {
            const match = this.analyzePolicyLinkCheerio($(element));
            if (match) policies.push(match);
        });

        const results = this.processPolicyResults(policies);
        this.logger.info('Policy extraction completed', {
            totalFound: results.length,
            byType: this.countPoliciesByType(results)
        });

        return results;
    }

    private analyzePolicyLinkCheerio($element: ReturnType<CheerioAPI>): PolicyMatch | null {
        try {
            const href = $element.attr('href');
            if (!href) return null;

            const linkText = $element.text();
            if (!linkText) return null;

            const context = $element.parent()?.text() || '';

            const result = this.analyzePolicyLink(href, linkText, context);
            if (result) {
                this.logger.debug('Policy link found', {
                    type: result.type,
                    confidence: result.confidence,
                    url: result.url
                });
            }

            return result;
        } catch (error) {
            this.logger.warn('Error analyzing link', { error });
            return null;
        }
    }

    private countPoliciesByType(policies: PolicyMatch[]): Record<string, number> {
        return policies.reduce((acc, policy) => {
            acc[policy.type] = (acc[policy.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }


    async findPoliciesPlaywright(page: Page): Promise<PolicyMatch[]> {
        this.logger.debug('Starting Playwright policy extraction');
        const policies: PolicyMatch[] = [];
        const startTime = Date.now();

        try {
            // Search in common locations first
            for (const location of this.commonLocations) {
                this.logger.debug('Searching common location', { location });
                const elements = await page.$$(location + ' a');
                this.logger.debug('Found elements in location', {
                    location,
                    elementCount: elements.length
                });

                for (const element of elements) {
                    const match = await this.analyzePolicyLinkPlaywright(element);
                    if (match) {
                        this.logger.debug('Found policy match in common location', {
                            location,
                            type: match.type,
                            confidence: match.confidence
                        });
                        policies.push(match);
                    }
                }
            }

            // Search all links as fallback
            this.logger.debug('Starting fallback search in all links');
            const allLinks = await page.$$('a');
            this.logger.debug('Found total links', { count: allLinks.length });

            for (const link of allLinks) {
                const match = await this.analyzePolicyLinkPlaywright(link);
                if (match) {
                    this.logger.debug('Found policy match in fallback search', {
                        type: match.type,
                        confidence: match.confidence
                    });
                    policies.push(match);
                }
            }

            const results = this.processPolicyResults(policies);
            const duration = Date.now() - startTime;

            this.logger.info('Playwright policy extraction completed', {
                totalFound: results.length,
                duration: `${duration}ms`,
                byType: this.countPoliciesByType(results)
            });

            return results;
        } catch (error) {
            this.logger.error('Playwright policy extraction failed', error);
            throw error;
        }
    }

    private async analyzePolicyLinkPlaywright(element: ElementHandle): Promise<PolicyMatch | null> {
        try {
            const href = await element.getAttribute('href');
            if (!href) {
                this.logger.debug('Skipping element - no href attribute');
                return null;
            }

            const linkText = await element.innerText();
            if (!linkText) {
                this.logger.debug('Skipping element - no link text', { href });
                return null;
            }

            // Get surrounding context
            const context = await element.evaluate((el: HTMLElement) => {
                const parent = el.parentElement;
                return parent ? parent.innerText : '';
            });

            const result = this.analyzePolicyLink(href, linkText, context);
            if (result) {
                this.logger.debug('Policy link analyzed successfully', {
                    href,
                    type: result.type,
                    confidence: result.confidence
                });
            }

            return result;
        } catch (error) {
            this.logger.warn('Error analyzing Playwright link', {
                error,
                elementInfo: await element.evaluate(el => ({
                    tagName: (el as HTMLElement).tagName,
                    className: (el as HTMLElement).className,
                    id: (el as HTMLElement).id
                }))

            });
            return null;
        }
    }

    private analyzePolicyLink(href: string, linkText: string, context: string): PolicyMatch | null {
        this.logger.debug('Analyzing policy link', { href, linkText });

        for (const [type, patterns] of Object.entries(this.policyPatterns)) {
            for (const pattern of patterns) {
                if (pattern.test(linkText) || pattern.test(href)) {
                    const confidence = this.calculateConfidence(linkText, href, pattern);

                    this.logger.debug('Found matching policy pattern', {
                        type,
                        pattern: pattern.toString(),
                        confidence
                    });

                    return {
                        type,
                        url: href,
                        confidence,
                        linkText: linkText.trim(),
                        context: context.trim()
                    };
                }
            }
        }

        return null;
    }

    private calculateConfidence(linkText: string, href: string, pattern: RegExp): number {
        let confidence = 0;
        const confidenceFactors: Record<string, number> = {};

        // Strong indicators
        if (pattern.test(linkText)) {
            confidence += 0.6;
            confidenceFactors.linkTextPattern = 0.6;
        }
        if (pattern.test(href)) {
            confidence += 0.4;
            confidenceFactors.hrefPattern = 0.4;
        }
        if (linkText.toLowerCase().includes('policy')) {
            confidence += 0.2;
            confidenceFactors.policyKeyword = 0.2;
        }
        if (href.toLowerCase().includes('policy')) {
            confidence += 0.2;
            confidenceFactors.policyInUrl = 0.2;
        }

        // Negative indicators
        if (href.includes('blog') || href.includes('post')) {
            confidence -= 0.3;
            confidenceFactors.blogPost = -0.3;
        }
        if (linkText.length > 50) {
            confidence -= 0.2;
            confidenceFactors.longText = -0.2;
        }

        const finalConfidence = Math.max(0, Math.min(1, confidence));

        this.logger.debug('Calculated confidence score', {
            finalConfidence,
            factors: confidenceFactors,
            input: {
                linkText,
                href,
                pattern: pattern.toString()
            }
        });

        return finalConfidence;
    }

    private processPolicyResults(policies: PolicyMatch[]): PolicyMatch[] {
        this.logger.debug('Processing policy results', {
            initialCount: policies.length
        });

        // Remove duplicates preferring higher confidence matches
        const uniquePolicies = new Map<string, PolicyMatch>();

        for (const policy of policies) {
            const existing = uniquePolicies.get(policy.type);
            if (!existing || policy.confidence > existing.confidence) {
                if (existing) {
                    this.logger.debug('Replacing existing policy with higher confidence match', {
                        type: policy.type,
                        oldConfidence: existing.confidence,
                        newConfidence: policy.confidence
                    });
                }
                uniquePolicies.set(policy.type, policy);
            }
        }

        const results = Array.from(uniquePolicies.values())
            .sort((a, b) => b.confidence - a.confidence);

        this.logger.info('Policy results processed', {
            initialCount: policies.length,
            finalCount: results.length,
            uniqueTypes: Array.from(uniquePolicies.keys())
        });

        return results;
    }
}
