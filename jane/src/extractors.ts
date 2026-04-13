// src/extractors.ts
import { CheerioAPI } from 'cheerio';
import { ServiceInfo, TeamMember } from './types.js';

export function extractPhoneNumbers($: CheerioAPI): string[] {
    const phoneRegex = /(\+?1?\s*\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/g;
    const pageText = $('body').text();
    const matches = pageText.match(phoneRegex) || [];
    return [...new Set(matches)];
}

export function extractEmails($: CheerioAPI): string[] {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const pageText = $('body').text();
    const matches = pageText.match(emailRegex) || [];
    return [...new Set(matches)];
}

export function extractServices($: CheerioAPI): ServiceInfo[] {
    const services: ServiceInfo[] = [];

    $('.nav-pills li a').each((_, element) => {
        const $el = $(element);
        const name = $el.find('strong').text().trim();
        const detailsText = $el.find('small').text().trim();

        if (name) {
            const service: ServiceInfo = { name };

            const details = detailsText.split('-').map(s => s.trim());
            if (details.length > 0) service.duration = details[0];
            if (details.length > 1) service.price = details[1];

            const id = $el.attr('href')?.split('#').pop();
            if (id) {
                service.description = $(`#${id}_description`).text().trim();
            }

            services.push(service);
        }
    });

    return services;
}

export function extractTeamMembers($: CheerioAPI): TeamMember[] {
    const members: TeamMember[] = [];

    $('.staff_member_thumb').each((_, element) => {
        const $el = $(element);
        const name = $el.find('.overlay').text().trim() ||
                    $el.find('p').text().trim();

        if (name) {
            const member: TeamMember = {
                name,
                photo: $el.find('img').attr('src'),
                title: $el.find('small').text().trim()
            };

            const bioId = $el.find('a').attr('href')?.split('/').pop();
            if (bioId) {
                member.description = $(`#staff_member_bio_${bioId}`).text().trim();
            }

            members.push(member);
        }
    });

    return members;
}
