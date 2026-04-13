// src/platform-detector.ts
import * as cheerio from 'cheerio';
import { PlatformInfo, ScrapingStrategy, ScrapingRequirements } from './types.js';
import { determineScrapingStrategy } from './strategy-detector.js';
import { PLATFORM_SIGNATURES } from './lib/platform-signatures.js';


export async function detectPlatform(html: string, url: string): Promise<PlatformInfo> {
    const $ = cheerio.load(html);
    const matches: Map<string, { count: number, indicators: Set<string> }> = new Map();

    // Initialize matches for each platform (existing code)
    Object.keys(PLATFORM_SIGNATURES).forEach(platform => {
        matches.set(platform, { count: 0, indicators: new Set() });
    });

    // Check URL patterns (existing code)
    Object.entries(PLATFORM_SIGNATURES).forEach(([platform, signature]) => {
        const platformMatch = matches.get(platform)!;
        signature.patterns.forEach(pattern => {
            if (pattern.test(url)) {
                platformMatch.count++;
                platformMatch.indicators.add(`URL match: ${pattern.toString()}`);
            }
        });
    });

    // Check HTML patterns (existing code)
    const htmlString = $.html();
    Object.entries(PLATFORM_SIGNATURES).forEach(([platform, signature]) => {
        const platformMatch = matches.get(platform)!;
        signature.patterns.forEach(pattern => {
            if (pattern.test(htmlString)) {
                platformMatch.count++;
                platformMatch.indicators.add(`HTML match: ${pattern.toString()}`);
            }
        });
    });

    // Check meta tags (existing code)
    $('meta').each((_, element) => {
        const metaEl = $(element);
        const attrs = ['name', 'property', 'http-equiv', 'charset']
            .map(attr => metaEl.attr(attr)?.toLowerCase() || '')
            .filter(Boolean);
        const content = metaEl.attr('content')?.toLowerCase() || '';

        Object.entries(PLATFORM_SIGNATURES).forEach(([platform, signature]) => {
            const platformMatch = matches.get(platform)!;
            if (!signature.meta) return;

            signature.meta.forEach(meta => {
                const metaLower = meta.toLowerCase();
                const hasMetaMatch = attrs.some(attr => attr.includes(metaLower));
                const hasContentMatch = content.includes(metaLower);

                if (hasMetaMatch || hasContentMatch) {
                    platformMatch.count++;
                    platformMatch.indicators.add(`Meta tag match: ${meta} ${hasContentMatch ? '(in content)' : '(in attributes)'}`);
                }
            });
        });
    });

    // Check script tags (existing code)
    $('script').each((_, element) => {
        const src = $(element).attr('src') || '';
        const content = $(element).html() || '';

        Object.entries(PLATFORM_SIGNATURES).forEach(([platform, signature]) => {
            const platformMatch = matches.get(platform)!;
            signature.patterns.forEach(pattern => {
                if (pattern.test(src) || pattern.test(content)) {
                    platformMatch.count++;
                    platformMatch.indicators.add(`Script match: ${pattern.toString()}`);
                }
            });
        });
    });

    // Calculate scores and find best match
    const results = Array.from(matches.entries())
        .map(([platform, { count, indicators }]) => ({
            name: platform,
            confidence: calculateConfidence(count, indicators.size),
            indicators: Array.from(indicators)
        }))
        .sort((a, b) => b.confidence - a.confidence);

    const bestMatch = results[0];
    let platformName = bestMatch.name;
    let indicators = bestMatch.indicators;
    let confidence = bestMatch.confidence;

    // Handle no matches case
    if (bestMatch.confidence < 0.3) {
        platformName = 'vanilla_html';
        confidence = 1;
        indicators = ['No framework-specific patterns detected'];
    }

    // Handle multiple strong matches
    const strongMatches = results.filter(r => r.confidence > 0.7);
    if (strongMatches.length > 1) {
        if (strongMatches.some(m => m.name === 'nextjs') &&
            strongMatches.some(m => m.name === 'react')) {
            platformName = 'nextjs_react';
            confidence = bestMatch.confidence;
            indicators = [...new Set([
                ...strongMatches[0].indicators,
                ...strongMatches[1].indicators
            ])];
        }
    }

    // Determine scraping strategy and requirements
    const { strategy, requirements } = determineScrapingStrategy(platformName, indicators);

    // Return complete PlatformInfo
    return {
        name: platformName,
        confidence: confidence,
        indicators: indicators,
        scrapingStrategy: strategy,
        requirements: requirements
    };
}

function calculateConfidence(matches: number, uniqueIndicators: number): number {
    if (matches === 0) return 0;
    const matchScore = Math.min(matches / 5, 1);
    const uniqueScore = Math.min(uniqueIndicators / 3, 1);
    return (matchScore * 0.4) + (uniqueScore * 0.6);
}
