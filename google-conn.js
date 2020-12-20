const { GoogleSpreadsheet } = require("google-spreadsheet");

module.exports = class Sheet {
  constructor() {
    // spreadsheet key is the long id in the sheets URL
    this.doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
  }

  async loadCredentials() {
    await this.doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY,
    });
    // await this.doc.useServiceAccountAuth(require("./credentials.json"));

    await this.doc.loadInfo();
  }

  async addRows(rows, i) {
    const sheet = this.doc.sheetsByIndex[i];

    await sheet.addRows(rows);
  }

  async addSheet(title, headerValues) {
    await this.doc.addSheet({ title, headerValues });

    return this.doc.sheetsByIndex.length - 1;
  }

  async getRow(i) {
    const sheet = this.doc.sheetsByIndex[i];

    const rows = await sheet.getRows();
    return rows;
  }
};

// const sheet = doc.sheetsByIndex[0]; // or use doc.sheetsById[id] or doc.sheetsByTitle[title]
// console.log(sheet.title);
// console.log(sheet.rowCount);

// // adding / removing sheets
// const newSheet = await doc.addSheet({ title: 'hot new sheet!' });
// await newSheet.delete();
