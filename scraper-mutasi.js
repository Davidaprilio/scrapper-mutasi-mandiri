const puppeteerType = require('puppeteer');
const { executablePath } = require('puppeteer');
/** @type {puppeteerType} */
const puppeteer = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth')
puppeteer.use(pluginStealth())
const { Cluster } = require('puppeteer-cluster');

process.setMaxListeners(0);

const OptionDate = {
    YESTERDAY: 'yesterday',
    LAST_WEEK: 'last_week',
    LAST_MONTH: 'last_month',
    TODAY: 'today',
    CUSTOM: 'custom',
}

// make hint for option
/**
 * @typedef {Object} Options
 * @property {string} company_id Company Id
 * @property {string} user_id User Id
 * @property {string} password Password
 * @property {string} rekening Nomor Rekening
 * @property {OptionDate[value]} date Option Date
 */

/** 
 * @param {Options} options
 */
const get_data_mutasi = async (options) => {
    // option must be object
    if (typeof options !== 'object') {
        throw new ErrorScraper('options must be object');
    }

    options = {
        date: OptionDate.TODAY,
        company_id: null,
        user_id: null,
        password: null,
        rekening: null,
        ...options
    }

    // validate all must string for
    for (const key in options) {
        if (typeof options[key] === undefined || options[key] === null) {
            throw new ErrorScraper(`${key} is required`);
        } else if (typeof options[key] !== 'string') {
            throw new ErrorScraper(`${key} must be string`);
        }
    } 

    const browser = await puppeteer.launch({
        headless: false,
        concurrency: Cluster.CONCURRENCY_CONTEXT,
        waitUntil: 'load',
        executablePath: executablePath(),
        maxConcurrency: 25,
        args: [
            '--no-sandbox', 
            '--enable-popup-blocking', 
            '--disable-notifications',
            '--disable-dev-shm-usage', 
            '--disable-web-security', 
            '--disable-features=IsolateOrigins', 
            '--disable-site-isolation-trials',
        ]
    });

    console.log('Browser Launched');
    const page = await browser.newPage();
    await page.goto('https://mcm2.bankmandiri.co.id/corporate/#!/login');

    async function logout() {
        await page.$eval('.nav-logout button', el => el.click());
        // verify logout
        try {
            await page.waitForSelector('button[ng-click="relogin()"]', {timeout: 5_000});
        } catch (error) {
            console.log('Gagal Logout');
            console.log(error.message);
            console.log(error);
            return false;
        }
        console.log('Berhasil Logout');
    }
    
    // Try Login
    // Login form selector: form[name="formLogin"]
    try {
        console.log('Mencoba login');
        await page.waitForSelector('form[name="formLogin"] > .form-group > div.tni-input > div > input');
        const loginInputs = await page.$$('form[name="formLogin"] > .form-group > div.tni-input > div > input');
        await loginInputs[0].type(options.company_id);
        await loginInputs[1].type(options.user_id);
        await loginInputs[2].type(options.password);

        // submit form login
        await page.$eval('form[name="formLogin"] button[type="submit"]', el => el.click());
        
        // cek apakah login berhasil jika tidak maka akan ada alert ambil textnya
        try {
            await page.waitForSelector('.nav-logout', {timeout: 5_000});
        } catch (error) {
            const alertText = await page.$eval('.alert-danger', el => el.innerText);
            throw new ErrorScraper('Gagal melakukan login', {alert: alertText});
        }
    } catch (error) {
        await browser.close();
        throw new ErrorScraper('Terjadi kesalahan saat login', {
            message: error.message,
            error
        });
    }
    console.log('Berhasil Login');

    try {
        await page.waitForSelector('#importantNotice', {timeout: 1_000});
        await page.$eval('#importantNotice', el => el.click());
        await page.waitForSelector('#importantNotice', {
            hidden: true,
            timeout: 500
        });
    } catch (error) {
        console.log('Modal tidak ditemukan');
    } 

    try {
        console.log('Mencoba membuka menu Account Statement');
        // # navigate to Account Statement
        // - open dropdown menu
        await page.$eval('.navbar-menu > .container > ul > li:nth-child(3) > a.dropdown-toggle', el => el.click());
        // - await for dropdown menu to show
        await page.waitForSelector('.navbar-menu > .container > ul > li:nth-child(3) > ul.dropdown-menu');
        // - click Account Statement menu
        await page.$eval('.navbar-menu > .container > ul > li:nth-child(3) > ul.dropdown-menu .yamm-content > .row > ul:nth-child(3) > li:nth-child(2) > a', el => el.click());
        // # navigated to Account Statement
        console.log('Berhasil membuka menu Account Statement');


        // # fill form Account Statement
        // - await for form to show
        await page.waitForSelector('form[name="formAccountStatementSearchSingle"]');
        const form = await page.$('form[name="formAccountStatementSearchSingle"]');
        // - fill Account Number
        console.log('Memilih rekening');
        await form.waitForSelector('.select2-choice', {timeout: 5_000})
        await form.$eval('.select2-choice', el => el.click())
        console.log('menunggu dropdown muncul');
        try {
            await page.waitForSelector('.select2-dropdown-open.open', {timeout: 2_000})
        } catch (error) {
            console.log('dropdown tidak muncul, mencoba klik lagi');
            await form.$eval('.select2-choice', el => el.click())
            await page.waitForSelector('.select2-dropdown-open.open', {timeout: 2_000})
            
        }
        // -- type on input '.select2-dropdown-open.open .select2-search input'
        await page.type('.select2-dropdown-open.open .select2-search input', options.rekening)
        // -- enter on input '.select2-dropdown-open.open .select2-search input'
        await page.keyboard.press('Enter')
        // - select date type select[name="postingDate"] value custom
        const select = await form.$('select[name="postingDate"]');

        console.log('Memilih tanggal');
        await select.select(options.date);


        // const startDate = new Date('2023-05-01')
        // const endDate = new Date('2023-05-31')

        // /** @param {Date} date */
        // async function selectDate(date) {
        //     const dateString = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).replaceAll(',', '')
        //     const selctorClickDetailLabel = `.md-datepicker-calendar .md-calendar-scroll-mask .md-virtual-repeat-offsetter > table.md-calendar > tbody[md-calendar-month-body] td[aria-label="${dateString}"] > span`
        //     await page.click(selctorClickDetailLabel)
        // }

        // const inputStartDate = await form.$('input.md-datepicker-input:nth-child(1)');
        // const inputEndDate = await form.$('input.md-datepicker-input:nth-child(2)');

        // await inputStartDate.click()

        // # fill form Account Statement
        console.log('Mencari data');
        await page.click(`button[type="submit"][ng-click="validateDateRange('accountStatementSearch')"]`)

        // scroll to bottom
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });

        await page.waitForSelector('section[ng-show="showTable"] .content form', {timeout: 3_000})
        console.log('Table ditemukan');
       
        // click div[st-table="rowCollection"] a.select2-choice
        await page.waitForSelector('section[ng-show="showTable"] div[st-table="rowCollection"] a.select2-choice', {timeout: 3_000})
        await page.click('section[ng-show="showTable"] div[st-table="rowCollection"] a.select2-choice')
        console.log('Dropdown dibuka');
        
        // type 100 .select2-dropdown-open.open input.ui-select-search  
        await page.waitForSelector('.select2-dropdown-open.open input.ui-select-search')
        await page.type('.select2-dropdown-open.open input.ui-select-search', '100')
        // enter
        await page.keyboard.press('Enter')

        await page.waitForSelector('ul.pagination')
        const totalPage = await page.$eval('ul.pagination', el => parseInt(el.innerText.replaceAll(/\D/g,'')))
        console.log('Total page:', totalPage)

        const info = await page.$$eval('section[ng-show="showTable"] .content form .form-group', formGroups => Object.values(formGroups).map(formGroup => ({
            [formGroup.querySelector('label').innerText]: formGroup.querySelector('div').innerText
        })).reduce((acc, cur) => ({...acc, ...cur}), {}))
        const data = []
        const thead = await page.$$eval('.table-div .thead > .tr > .th:not(.ng-hide):not(.util-field)', ths => Object.values(ths).map(th => th.innerText))
        data.push(thead)

        async function getDataTable() {
            return await page.$$eval('.table-div .tbody > .tr', trs => Object.values(trs).map(tr => {
                const tds = tr.querySelectorAll('.td:not(.ng-hide):not(.util-field)')
                return Object.values(tds).map(td => td.innerText)
            }))
        }

        let maxLoop = 1000
        while (await page.$eval('page-select input', el => parseInt(el.value)) <= totalPage) {
            const currentPage = await page.$eval('page-select input', el => parseInt(el.value))
            console.log('Scraping Page:', currentPage);
            data.push(...await getDataTable())
            // jika sudah di halaman terakhir
            if (currentPage === totalPage || maxLoop-- <= 0) {
                break;
            }
            await page.click('ul.pagination > li:nth-child(4) > a')
        }

        console.log('Scraping selesai');

        try {
            await logout();
            await browser.close();
        } catch (error) {
            console.log('Terjadi kesalahan, mencoba logout');
            await browser.close();
        }

        return {
            info,
            data
        }

    } catch (error) {
        console.log('Terjadi kesalahan, mencoba logout untuk keamanan');
        await logout();
        console.log(error.message);
        console.log(error);
        await browser.close();
        throw error;
    }
}

class ErrorScraper extends Error {
    constructor(message, data = {}) {
        super(message);
        this.name = "ErrorScraper";
        this.data = data;
    }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    get_data_mutasi,
    OptionDate,
    ErrorScraper
};