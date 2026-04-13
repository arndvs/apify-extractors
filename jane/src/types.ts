export interface JaneDomain {
    domain: string;
    address: string;
    sameIpDomains: string;
    type: string;
    entryDate: string;
    alive: boolean | null;
    source: string;
}

export interface ServiceInfo {
    name: string;
    duration?: string;
    price?: string;
    description?: string;
}

export interface TeamMember {
    name: string;
    title?: string;
    description?: string;
    photo?: string;
}

export interface ScrapedData {
    siteDomain: string;
    mainDomain?: string;
    logo?: string;
    phoneNumbers: string[];
    emails: string[];
    services: ServiceInfo[];
    teamMembers: TeamMember[];
}

export interface Input {
    domains: JaneDomain[];
}
