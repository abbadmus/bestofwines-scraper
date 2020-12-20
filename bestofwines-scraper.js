const Sheet = require("./google-conn");
const _ = require("lodash");
const puppeteer = require("puppeteer");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const sleep = require("util").promisify(setTimeout);

log = console.log;

const productDetails = async (urls) => {
  let finalDetails = [];

  for (let url of urls) {
    try {
      const res = await fetch(url);
      const text = await res.text();

      const $ = cheerio.load(text);

      const allDetailsObj = {};

      const product_name = $("h1").text();
      allDetailsObj.product_name = product_name;

      const priceExVat = `${
        $("#price-big").text().replace(/\n/g, "").split(")")[0]
      })`;
      allDetailsObj.priceExVat = priceExVat;

      const priceInVat = `${
        $("#price-big").text().replace(/\n/g, "").split(")")[1]
      })`;
      allDetailsObj.priceInVat = priceInVat;

      url = res.url;
      allDetailsObj.url = url;

      const image_url = `https://bestofwines.com${$(
        "#wine-img > a > picture > img"
      ).attr("src")}`;
      allDetailsObj.image_url = image_url;

      const detailContainer = $("tr").toArray();

      const details = detailContainer.map((c) => {
        const active = $(c);
        const keyword = active.find(".table-label").text();

        const value = active.find(".table-label").next().text().trim();

        return { keyword, value };
      });

      // tr td:contains("Classification")

      details.forEach((e) => {
        if (e.keyword.includes(" ")) {
          e.keyword = e.keyword.split(" ")[0];
        }

        allDetailsObj[e.keyword] = e.value;
      });

      log(allDetailsObj);

      finalDetails = [...finalDetails, allDetailsObj];
      sleep(500);
    } catch (error) {
      log(error.message);

      log(`Unable to scrape ${url}`);
      continue;
    }
  }

  return finalDetails;
};

const getAllLinks = async (page) => {
  await page.goto(
    `https://bestofwines.com/search/?type=2%2C%203%2C%204%2C%205%2C%207%2C%208%2C%209%2C%2010%2C%2011%2C%2012%2C%2013%2C%2014%2C%2015%2C%2016%2C%2017&view=grid&countries%5B%5D=5&countries%5B%5D=12&countries%5B%5D=6&countries%5B%5D=4&countries%5B%5D=3&countries%5B%5D=8&price_min=%E2%82%AC%2010%2C-&price_max=%E2%82%AC%2040.000%2C-`,
    {
      waitUntil: "load",
      timeout: 0,
    }
  );

  await scrollToBottom(page);

  let productLinks = await page.$$eval(".tile-wrapper.show-wine", (e) =>
    e.map((a) => a.href)
  );

  log("done scrolling");

  // await browser.close();

  return productLinks;
};

async function scrollToBottom(page) {
  const distance = 2500; // should be less than or equal to window.innerHeight
  const delay = 3000;
  while (
    await page.evaluate(
      () =>
        document.scrollingElement.scrollTop + window.innerHeight <
        document.scrollingElement.scrollHeight
    )
  ) {
    await page.evaluate((y) => {
      document.scrollingElement.scrollBy(0, y);
    }, distance);
    await page.waitForTimeout(delay);
    log("done scrolling");
  }
}

(async function () {
  // { headless: false }
  const browser = await puppeteer.launch({
    headless: true,
  });
  const page = await browser.newPage();
  const allLinks = await getAllLinks(page);
  log(allLinks);

  const finalDetails = await productDetails(allLinks);

  // google sheet setup
  const sheet = new Sheet();
  await sheet.loadCredentials();

  // //   await sheet.headerValues(["hello", "email"]);

  rawIndex = await sheet.addSheet(`Best of wine ${new Date().getMinutes()}`, [
    "product_name",
    "priceExVat",
    "priceInVat",
    "Classification",
    "Type",
    "Brand",
    "Country",
    "Region",
    "Volume",
    "Condition",
    "Label",
    "Stock",
    "Age",
    "Cask",
    "Alcohol",
    "Bottler",
    "Serie",
    "Distilled",
    "Vintage",
    "url",
    "image_url",
  ]);

  await sheet.addRows(finalDetails, rawIndex);
  log("saving to google sheet");
  await browser.close();
})();
