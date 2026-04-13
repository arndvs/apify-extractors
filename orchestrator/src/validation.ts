// actors/master-orchestrator/src/validation.ts
import { URL } from 'url';
import type { CommonInput } from './types.js';

export class ValidationTools {
    static validateUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    static validateInput(input: CommonInput): void {
        if (!input.url) {
            throw new Error('URL is required');
        }

        if (!this.validateUrl(input.url)) {
            throw new Error('Invalid URL format');
        }

        if (input.maxTimeout && (typeof input.maxTimeout !== 'number' || input.maxTimeout < 0)) {
            throw new Error('maxTimeout must be a positive number');
        }

        if (input.retryCount && (typeof input.retryCount !== 'number' || input.retryCount < 0)) {
            throw new Error('retryCount must be a positive number');
        }

        // Validate extractors if provided
        if (input.extractors && typeof input.extractors === 'object') {
            const validExtractors = ['websiteContentCrawler', 'color', 'policy', 'contact', 'faq', 'product'];
            Object.keys(input.extractors).forEach(key => {
                if (!validExtractors.includes(key)) {
                    throw new Error(`Invalid extractor: ${key}`);

                }
                if (typeof input.extractors![key] !== 'boolean') {
                    throw new Error(`Extractor ${key} must be a boolean`);
                }
            });
        }
    }

    static sanitizeUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            // Remove trailing slashes
            return urlObj.href.replace(/\/$/, '');
        } catch {
            throw new Error('Invalid URL format');
        }
    }

    static validateContentExists(content: unknown): void {
        if (!content) {
            throw new Error('No content found');
        }
    }

    static isValidHttpUrl(url: string): boolean {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    }

    static sanitizeText(text: string): string {
        return text
            .trim()
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/[\r\n]+/g, '\n'); // Normalize line breaks
    }

    static getErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }
        return String(error);
    }
}
