declare module 'colorthief' {
    import { Canvas } from 'canvas';

    interface ColorThiefOptions {
        quality?: number;
        amount?: number;
    }

    class ColorThief {
        /**
         * Get dominant color from image
         * returns {number[]} 3 element array containing RGB values
         */
        getColor(sourceImage: HTMLImageElement | HTMLCanvasElement | Canvas | null, quality?: number): [number, number, number];

        /**
         * Get palette from image
         * returns {number[][]} array of 3 element arrays containing RGB values
         */
        getPalette(sourceImage: HTMLImageElement | HTMLCanvasElement | Canvas | null, colorCount?: number, quality?: number): [number, number, number][];
    }

    export = ColorThief;
}
