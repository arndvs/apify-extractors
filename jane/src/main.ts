import { Actor } from 'apify';
import { CheerioCrawler, Dataset } from 'crawlee';
import { load } from 'cheerio';
import { Input, ScrapedData } from './types.js';
import { extractEmails, extractPhoneNumbers, extractServices, extractTeamMembers } from './extractors.js';

await Actor.init();

const input = await Actor.getInput<Input>();

if (!input?.domains?.length) {
    throw new Error('Input must provide domains array!');
}

const crawler = new CheerioCrawler({
    maxConcurrency: 10,
    async requestHandler({ response, request }) {
        const $ = load(await response.body as string);
        const domain = new URL(request.url).hostname;
        const data: ScrapedData = {
            siteDomain: domain,
            mainDomain: $('.company_header a').attr('href') ||
                       $('.logo_or_name a').attr('href'),
            logo: $('.company_header img').attr('src') ||
                  $('.logo_or_name img').attr('src'),
            phoneNumbers: extractPhoneNumbers($),
            emails: extractEmails($),
            services: extractServices($),
            teamMembers: extractTeamMembers($)
        };

        await Dataset.pushData(data);
    },

    failedRequestHandler({ request }) {
        console.log(`Request ${request.url} failed too many times`);
    },
});

await crawler.addRequests(
    input.domains.map(domain => ({
        url: `https://${domain.domain}`
    }))
);

await crawler.run();
await Actor.exit();
