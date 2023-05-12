require('dotenv').config();
const { get_data_mutasi, OptionDate } = require("./scraper-mutasi");
const fs = require('fs');

async function test() {
    const result = await get_data_mutasi({
        company_id: process.env.COMPANY_ID,
        user_id: process.env.USER_ID,
        password: process.env.PASSWORD,
        rekening: process.env.REKENING,
        date: OptionDate.TODAY
    });

    console.log(result);

    fs.writeFileSync('result.json', JSON.stringify(result, null, 4));
}
test()