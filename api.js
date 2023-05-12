const express = require('express');
const app = express();
const port = 30000;
const bodyParser = require('body-parser');
const cors = require('cors');
const { OptionDate, get_data_mutasi } = require('./scraper-mutasi');

// parse application/json
app.use(bodyParser.json());
app.use(cors());
const rekeningState = []
// get data mutasi rekening
app.get('/mutasi', async (req, res) => {
    const companyId = req.query.companyId || req.params.companyId;
    const userId = req.query.userId || req.params.userId;
    const rekening = req.query.rekening || req.params.rekening;
    const date = req.query.date || req.params.date;
    const password = req.query.password || req.params.password;

    // validation required all
    if (companyId === undefined || userId === undefined || rekening === undefined || date === undefined || password === undefined) {
        let d = {companyId, userId, rekening, date , password};
        d = Object.entries(d).filter(([_, value]) => value === undefined).map(([key, _]) => key);
        return res.status(400).json({
            status: false, 
            error: 'Bad Request', 
            // remove undefined value form d
            message: 'Required: ' + Object.values(d).join(', ')
        });
    }

    // validation date must be on OptionDate
    if (OptionDate[date] === undefined) {
        return res.status(400).json({status: false, error: 'Bad Request', message: `date must be on ${Object.keys(OptionDate).join(', ')}`});
    }

    // tambahkan rekening ke state
    if (rekeningState.includes(rekening)) {
        return res.status(400).json({status: false, error: 'Bad Request', message: `rekening ${rekening} is already in use, please wait for a moment`});
    }
    rekeningState.push(rekening);

    try {
        console.log(`get data mutasi from rekening: ${rekening}`);
        const data = await get_data_mutasi({
            company_id: companyId,
            user_id: userId,
            rekening: rekening,
            date: OptionDate[date],
            password: password
        })

        // remove rekening from state
        rekeningState.splice(rekeningState.indexOf(rekening), 1);
        
        return res.status(200).json({
            status: true,
            message: 'success',
            data: data
        });
    } catch (error) {
        rekeningState.splice(rekeningState.indexOf(rekening), 1);
        return res.status(500).json({
            status: false,
            error: error.message,
            data: error.data
        });
    }
});

// listen port 3000
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});