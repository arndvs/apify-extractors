import { Actor } from 'apify';
import { launchPuppeteer } from 'crawlee';
import axios from 'axios';
import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as path from 'path';

// Define type for ColorThief Node.js API
interface ColorThiefStatic {
    // eslint-disable-next-line
    getColor(_: string): Promise<[number, number, number]>;
}

// We'll import ColorThief dynamically since it's a CommonJS module
let ColorThief: ColorThiefStatic;

async function initializeColorThief() {
    // Dynamic import of ColorThief
    const module = await import('colorthief');
    ColorThief = module.default as unknown as ColorThiefStatic;
}

interface Input {
    url: string;
    fullPage?: boolean;
    quality?: number;
    useOpenAI?: boolean;
    useColorThief?: boolean;
}

interface Output {
    url: string;
    screenshotKey: string;
    screenshotUrl: string;
    fullPage: boolean;
    quality: number;
    brandColorOpenAI?: string;
    brandColorColorThief?: string;
}

await initializeColorThief();
await Actor.init();
const input = await Actor.getInput<Input>();

if (!input?.url) {
    throw new Error('URL must be provided in input');
}

let output: Output | null = null;

try {
    const kvStore = await Actor.openKeyValueStore();
    const storeId = kvStore.id;

    const browser = await launchPuppeteer({
        useChrome: true,
        launchOptions: {
            args: [
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--disable-setuid-sandbox',
                '--no-first-run',
                '--no-sandbox',
                '--no-zygote',
                '--deterministic-fetch',
                '--disable-features=IsolateOrigins',
                '--disable-site-isolation-trials'
            ],
            defaultViewport: { width: 1920, height: 1080 }
        }
    });

    try {
        const page = await browser.newPage();
        await page.setBypassCSP(true);
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['document', 'image'].includes(req.resourceType())) req.continue();
            else req.abort();
        });

        console.log('Navigating to URL:', input.url);
        await page.goto(input.url, { waitUntil: 'networkidle0', timeout: 30000 });

        console.log('Taking header screenshot...');
        const viewport = await page.viewport();
        const headerHeight = 200;

        const headerScreenshot = await page.screenshot({
            clip: { x: 0, y: 0, width: viewport?.width || 1920, height: headerHeight },
            type: 'jpeg',
            quality: input.quality ?? 80,
        });

        const headerScreenshotKey = `HEADER-${Date.now()}.jpg`;
        await Actor.setValue(headerScreenshotKey, headerScreenshot, { contentType: 'image/jpeg' });

        const headerScreenshotUrl = `https://api.apify.com/v2/key-value-stores/${storeId}/records/${headerScreenshotKey}`;
        console.log('Header screenshot URL:', headerScreenshotUrl);

        output = {
            url: input.url,
            screenshotKey: headerScreenshotKey,
            screenshotUrl: headerScreenshotUrl,
            fullPage: input.fullPage ?? false,
            quality: input.quality ?? 80
        };

        if (input.useOpenAI) {
            console.log('Extracting brand color via OpenAI Vision...');
            output.brandColorOpenAI = await extractBrandColorOpenAI(headerScreenshotUrl);
            console.log('OpenAI Detected Brand Color:', output.brandColorOpenAI);
        }

        if (input.useColorThief !== false) {
            console.log('Extracting brand color via ColorThief...');
            output.brandColorColorThief = await extractBrandColorColorThief(headerScreenshotUrl);
            console.log('ColorThief Detected Brand Color:', output.brandColorColorThief);
        }

    } finally {
        await browser.close();
    }
} catch (error) {
    console.error('Screenshot capture failed:', error);
    throw error;
} finally {
    if (output) {
        await Actor.pushData(output);
        console.log('Screenshot saved. You can access it at:', output.screenshotUrl);
    }
    await Actor.exit();
}

/**
 * Calls OpenAI Vision API to extract brand color
 */
async function extractBrandColorOpenAI(imageUrl: string): Promise<string | undefined> {
    try {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await client.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are an AI assistant that extracts brand colors from images." },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "What is the most prominent brand color in this image? Respond with just the hex color code." },
                        { type: "image_url", image_url: { url: imageUrl } }
                    ]
                }
            ]
        });

        return response.choices[0]?.message?.content?.trim() || undefined;
    } catch (error) {
        console.error('OpenAI Vision API failed:', error);
        return undefined;
    }
}

/**
 * Uses ColorThief to extract the dominant color from an image
 */
async function extractBrandColorColorThief(imageUrl: string): Promise<string | undefined> {
    try {
        // Download the image to a temporary file
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const tempDir = '/tmp';
        const tempFile = path.join(tempDir, `temp-${Date.now()}.jpg`);

        await fs.writeFile(tempFile, response.data);

        try {
            // Get the dominant color using ColorThief
            const color = await ColorThief.getColor(tempFile);

            // Convert RGB to HEX
            const [r, g, b] = color;
            const toHex = (n: number): string => n.toString(16).padStart(2, '0');
            const hexColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

            return hexColor;
        } finally {
            // Clean up the temporary file
            await fs.unlink(tempFile).catch(console.error);
        }
    } catch (error) {
        console.error('ColorThief extraction failed:', error);
        if (error instanceof Error) {
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
        }
        return undefined;
    }
}
