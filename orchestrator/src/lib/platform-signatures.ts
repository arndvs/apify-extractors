import { PlatformSignature } from "../types.js";

export const PLATFORM_SIGNATURES: Record<string, PlatformSignature> = {
    wordpress: {
        patterns: [
            /wp-content/i,
            /wp-includes/i,
            /wordpress/i,
            /"wp-/i,
            /class="wp-/i,
            /wp_/i
        ],
        meta: [
            'generator',
            'wordpress'
        ]
    },
    shopify: {
        patterns: [
            /shopify/i,
            /cdn\.shopify\.com/i,
            /\.myshopify\.com/i,
            /shopify-buy/i
        ],
        meta: [
            'shopify-checkout-api-token',
            'shopify-digital-wallet'
        ]
    },
    wix: {
        patterns: [
            /wix\.com/i,
            /wixsite/i,
            /wix-/i,
            /_wix/i
        ],
        meta: [
            'generator',
            'wix'
        ]
    },
    webflow: {
        patterns: [
            /webflow/i,
            /\.webflow\.io/i,
            /\.webflow\.com/i
        ],
        meta: [
            'generator',
            'webflow'
        ]
    },
    squarespace: {
        patterns: [
            /squarespace/i,
            /static\.squarespace/i,
            /static1\.squarespace/i
        ],
        meta: [
            'generator',
            'squarespace'
        ]
    },
    react: {
        patterns: [
            /react/i,
            /reactjs/i,
            /data-reactroot/i,
            /react-app/i
        ],
        meta: ['react-version', 'react-root']
    },
    nextjs: {
        patterns: [
            /_next\//i,
            /__next/i,
            /next\//i,
            /nextjs/i
        ]
    },
    gatsby: {
        patterns: [
            /gatsby/i,
            /___gatsby/i,
            /gatsby-/i
        ]
    },
    vue: {
        patterns: [
            /vue/i,
            /vuejs/i,
            /nuxt/i,
            /data-v-/i
        ]
    },
    angular: {
        patterns: [
            /angular/i,
            /ng-/i,
            /data-ng-/i
        ]
    },
    bubble: {
        patterns: [
            /bubble\.io/i,
            /bubble_/i,
            /bubbleapps/i
        ]
    }
};
