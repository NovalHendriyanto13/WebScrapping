import { Request, Response } from "express";
import puppeteer from "puppeteer-extra";
import { app_config } from "../../../configs/app.config";
import { ShopeeScrapp } from "../../interfaces/shopee.interface";

import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export async function scrapping(req: Request<{}, {}, ShopeeScrapp>, res: Response) {
    const { storeId, dealId } = req.body;

    const url: string = `${app_config.shopee_base_api}/a-i.${storeId}.${dealId}`;
    const apiUrl: string = `${app_config.shopee_base_api}/api/v4/pdp/get_pc?itemid=${dealId}&shopid=${storeId}`;
    
    const sleepWait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
        const browser = await puppeteer.launch({ 
            headless: true,
            executablePath: '/usr/bin/chromium', 
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--headless=new',
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--disable-software-rasterizer',
                '--disable-blink-features=AutomationControlled',
            ],
        });

        const page = await browser.newPage();

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114 Safari/537.36'
        );

        await page.setExtraHTTPHeaders({
            'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        });

        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const blocked = ['image', 'stylesheet', 'font'];
            if (blocked.includes(req.resourceType())) req.abort();
            else req.continue();
        });

        await page.goto(url, { waitUntil: 'networkidle2' });

        await sleepWait(5);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

        const response = await page.evaluate((apiUrl) => {
            return window.fetch(apiUrl, {
                method: 'GET',
                credentials: 'include',
            }).then(res => res.json());
        }, apiUrl);

        await browser.close();

        res.status(200).json({
            status: 'OK',
            data: response,
            message: 'Scraped successfully',
        });
    } catch (error: any) {
        console.error('Shopee scraping error:', error);
        res.status(500).json({
            status: 'ERROR',
            data: null,
            message: {
                url,
                apiUrl,
                error: error.message,
                stack: error.stack,
            },
        });
    }
}
