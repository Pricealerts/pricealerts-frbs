import { getDatabase } from "firebase-admin/database";
import axios from "axios";

const BOT_TOKENEV = process.env.BOT_TOKEN;
const chatIdAbdelhadi = process.env.DADI_CHAT_ID;
let db;
function getDb() {
    if (!db) db = getDatabase();
    return db;
}
// ------------------------
// جلب رموز بورصة واحدة من البورصات لخرين
// ------------------------
async function getExchangeSymbols() {
    db = getDb();
    const exchngsStk = [
        "HKEX",
        "LSE",
        "NSE",
        "SIX",
        "XSWX",
        "XPAR",
        "XSHG",
        "XSHE",
        "XSES",
    ];
    try {
        const promises = exchngsStk.map(e => exchangeSymbols(e));

        promises.push(
            ...[
                gtStocks("https://datahub.io/core/nasdaq-listings/r/nasdaq-listed.csv"),
                gtStocks(
                    "https://datahub.io/core/nyse-other-listings/r/nyse-listed.csv",
                ),
                gateIoSmblsFn(),
            ],
        ); // nasdaq
        exchngsStk.push(...["nasdaq", "nyse", "gateIoSmbls"]);
        const rsltsPr = await Promise.all(promises);
        const prDatabes = [];
        for (let i = 0; i < exchngsStk.length; i++) {
            if (rsltsPr[i].length > 5) {
                prDatabes.push(db.ref(`${exchngsStk[i]}`).set(rsltsPr[i]));
            } else {
                prDatabes.push(sndErr(exchngsStk[i]));
            }
        }
        await Promise.all(prDatabes);

        async function sndErr(exchngStk) {
            const messageText = `slam 3likm Abdelhadi ${exchngStk} rah khawi 3awd chofah `;
            await sendTelegramMessage(chatIdAbdelhadi, messageText);
        }
    } catch (error) {
        console.log("kayn error f getExchangeSymbols : ");
        console.log(error);
    }
}

async function exchangeSymbols(exchange) {
    try {
        const url = `https://api.twelvedata.com/stocks?exchange=${exchange}`;
        const res = await axios.get(url);
        return res.data.data.map(i => i.symbol) || [];
    } catch (error) {
        console.error(`error in exchangeSymbols (${exchange}):`, error);
        return [];
    }
}

// -------------------------
async function gateIoSmblsFn() {
    try {
        const url = "https://api.gateio.ws/api/v4/spot/tickers";
        const res = await axios.get(url);
        const tickers = res.data;
        if (!Array.isArray(tickers)) {
            console.error("البيانات المستلمة ليست مصفوفة");
            console.log(tickers);
            return [];
        }
        return tickers.map(item => item.currency_pair) || [];
    } catch (error) {
        console.error("فشل جلب البيانات من Gate.io:", error);
        return [];
    }
}
// -------------------------
// ------------------------

// ------------------------
// جلب رموز   من البورصات nasdaq nyse
// ------------------------

async function gtStocks(url) {
    const ftch = await axios.get(url);
    const csv = ftch.data;
    // تحويل CSV إلى مصفوفة
    const rows = csv.split("\n").map(r => r.split(","));
    // تجاوز الصف الأول (الرؤوس)
    const row = rows
        .slice(1)
        .map(r => r[0])
        .filter(Boolean);
    return row || [];
}
// ------------------------

// ------------------------
// nta3 database mn requer
// ------------------------
/* async function stocksExchange(exchange) {
    db = getDb();
    try {
        const snap = await db.ref("stockSymbols").child(exchange).get();
        if (!snap.exists()) console.log(`لا توجد بيانات للبورصة: ${exchange}`);
        return snap.val();
    } catch (error) {
        return "حدث خطأ" + error;
    }
} */

/////// nta3 message
async function sendMesageFn(messageText) {
    try {
        const msag = `عبدالهادي جائتك رسالة من ${messageText.nameUser} 
ايميله : ${messageText.emailUser} 
الرسالة : ${messageText.msageUser} 
 `;
        await sendTelegramMessage(chatIdAbdelhadi, msag);
        return { statusMsge: "ok" };
    } catch (error) {
        return { statusMsge: "no" };
    }
}

/////// nta3 telegram
async function sendTelegramMessage(chatId, messageText) {
    if (!BOT_TOKENEV || BOT_TOKENEV === "YOUR_BOT_TOKENEV") {
        return { success: false, error: "توكن بوت تيليجرام غير موجود." };
    }
    let rspns = {};
    const TELEGRAM_API_URL = `https://api.telegram.org/bot${BOT_TOKENEV}/sendMessage`;

    let payload = {
        chat_id: chatId,
        text: messageText,
        parse_mode: "HTML",
    };

    try {
        const response = await axios.post(TELEGRAM_API_URL, payload);

        rspns = { success: true, response: response.data };
    } catch (error) {
        console.error(
            "خطأ في إرسال رسالة تيليجرام:",
            error.response ? error.response.data : error.message,
        );
        rspns = {
            success: false,
            error: error.response ? error.response.data : error.message,
        };
    }
    return rspns;
}

async function srchSmbls(querySmble) {
    const apiUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${querySmble}`;
    let responseFnl = [];
    try {
        let rslt = (await axios.get(apiUrl)).data.quotes;
        for (const quote of rslt) {
            const estCandle = {
                symbol: quote.symbol,
                exchDisp: quote.exchDisp,
                shortname: quote.shortname,
                quoteType: quote.quoteType,
            };
            responseFnl.push(estCandle);
        }
    } catch (error) {
        return {
            error: "Failed to fetch data1",
            details: error.message,
        };
    }

    return responseFnl;
}
const agents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 OPR/130.0.0.0",
];

async function price(smbl) {
    const urlPrice = s =>
        `https://query1.finance.yahoo.com/v8/finance/chart/${s}?interval=1h&range=1d`;
    const searchUrl = s =>
        `https://query2.finance.yahoo.com/v1/finance/search?q=${s}`;

    // إعداد الـ Headers لمحاكاة متصفح حقيقي وتجنب الـ 404 أو المنع
    const config = {
        headers: { "User-Agent": agents[Math.floor(Math.random() * agents.length)] },
    };
    try {
        let response;
        let result;
        try {
            response = await axios.get(urlPrice(smbl), config);
            result = response.data?.chart?.result?.[0];
        } catch (e) {
            // إذا أعطى 404، نترك result فارغة لننتقل للبحث
            result = null;
        }

        // إذا لم يجد الرمز أو حدث خطأ، نبحث عن اقتراحات
        if (!result) {
            const searchRes = await axios.get(searchUrl(smbl), config);
            const bestMatch = searchRes.data?.quotes?.[0]?.symbol;

            if (bestMatch) {
                response = await axios.get(urlPrice(bestMatch), config);
                result = response.data?.chart?.result?.[0];
            }
        }

        if (!result) return { error: "Symbol not found", smbl };

        const q = result.indicators?.quote?.[0];
        const meta = result.meta;

        // استخراج السعر بذكاء
        let lastClose = null;
        if (q?.close) {
            for (let i = q.close.length - 1; i >= 0; i--) {
                if (q.close[i] !== null && q.close[i] !== undefined) {
                    lastClose = q.close[i];
                    break;
                }
            }
        }

        return {
            symbol: meta.symbol,
            close: lastClose || meta.regularMarketPrice,
            currency: meta.currency,
            name: meta.longName || meta.shortName,
            exchangeName: meta.exchangeName,
        };
    } catch (error) {
        return {
            error: "Failed to fetch data",
            details: error.response?.data?.chart?.error?.description || error,
        };
    }
}


export { getExchangeSymbols, sendMesageFn, price, srchSmbls };
