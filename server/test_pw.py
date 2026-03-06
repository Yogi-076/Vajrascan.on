import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        print("Launching firefox...")
        browser = await p.firefox.launch(headless=True)
        print("Browser launched.")
        page = await browser.new_page()
        print("Going to example.com...")
        await page.goto("http://example.com")
        print("Success! closing...")
        await browser.close()

asyncio.run(run())
