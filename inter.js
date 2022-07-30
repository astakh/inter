const ccxt      = require ('ccxt');
const axios     = require ('axios')
const db        = require('./db/dbinter')
const WebSocket = require('ws')
const func      = require('./functions');
const { Coin } = require('./models/Coins');
const { now } = require('mongoose');
require('dotenv').config()

let exch = []
//exch.push(new ccxt.binance( { apiKey: process.env.BINANCE_API_KEY,                  secret: process.env.BINANCE_API_SECRET }))
exch.push(new ccxt.gateio(  { apiKey: process.env.GATEIO_API_KEY,                   secret: process.env.GATEIO_API_SECRET }))
exch.push(new ccxt.kucoin(  { apiKey: process.env.KUCOIN_API_KEY,                   secret: process.env.KUCOIN_API_SECRET }))
exch.push(new ccxt.huobi(   { apiKey: process.env.HUOBI_API_KEY,                    secret: process.env.HUOBI_API_SECRET }))
//exch.push(new ccxt.bibox(   { apiKey: process.env.BIBOX_API_KEY,                    secret: process.env.BIBOX_API_SECRET }))
exch.push(new ccxt.okx(     { apiKey: process.env.OKX_API_KEY,                      secret: process.env.OKX_API_SECRET,         password: process.env.OKX_PASS }))
//console.log(exch)
async function addCoins() {
    const book = await exch.loadMarkets()
    const pairs = Object.keys(book) 
    for (var i=0; i<pairs.length; i++) { 
        const pair  = pairs[i].split('/')
        const coin  = await Coin.findOne({name: pair[0]})
        const m     = pair[1]
        if (!coin) {
            let markets = {BNB: false, BTC: false, ETH: false, USDT: false, BUSD: false}
            markets[m] = true
            await db.addCoin({name: pair[0], market: markets})
        }
        else { 
            if (m == 'BNB' || m == 'BTC' || m == 'ETH' || m == 'USDT' || m == 'USDC' || m == 'BUSD') {
                coin.market[m] = true
                console.log(coin.market) 
                await db.changeCoin({name: pair[0]}, coin.market)
            }
        }
        console.log(pair[0])
    }
}
async function avgTrade(exch, pair, volume, direct) {
    const book1 = await exch.fetchOrderBook(pair, 20)
    let vol = 0
    let avg = 0
    for (var i = 0; i<book1[direct].length; i++) {
        if (vol == 0) {
            vol = book1[direct][i][0] * book1[direct][i][1]
            avg = book1[direct][i][0]
        }
        else {
            avg = (avg * vol + book1[direct][i][0] * book1[direct][i][1]) / (vol + book1[direct][i][1])
            vol += book1[direct][i][0] * book1[direct][i][1]
        }
        if (vol > volume) { break }
    }
    return avg
}
async function market (exch) {
    console.log(exch.name + ':')
    const starttime     = new Date()
    const m             = await exch.fetchTickers()
    const pairs         = Object.keys(m) 
    const pairsCount    = pairs.length
    let   coinsCount    = 0
    let   volume        = 50 
    for (var i=0; i<pairsCount; i++) { 
        const pair  = pairs[i].split('/')
        const coin = pair[0]
        const base = pair[1]
        let baseOk = false
        let coinOk = false
        if (base == 'BNB' || base == 'BTC' || base == 'ETH' || base == 'USDT' || base == 'USDC' || base == 'BUSD') { baseOk = true }
        const c = await Coin.findOne({name: coin})
        if (baseOk && c && m[coin + '/' + base] && m[base + '/USDT'] && m[coin + '/USDT'] && coin != 'EPS') { coinOk = true }
        if (coinOk && m[coin + '/' + base].ask>0 && m[base + '/USDT'].ask>0 && m[coin + '/USDT'].ask>0) { 
            coinsCount++
            let amountC     = 100 / m[coin + '/USDT'].ask
            let amountB     = amountC * m[coin + '/' + base].bid
            let profit      = amountB * m[base + '/USDT'].bid - (3 * 0.1) - 100

            if (profit > 0.3 && profit < 10) {
                const avg1 = await avgTrade(exch, coin + "/USDT", 50, "asks")
                const avg2 = await avgTrade(exch, coin + "/" + base, 50 / m[coin + '/' + base].bid, "bids")
                const avg3 = await avgTrade(exch, base + '/USDT', 50, "bids")
                profit     = (100/avg1*avg2*avg3) - 0.3 - 100
                if (profit > 0.3) {
                    console.log(avg1, avg2, avg3, profit.toFixed(2))
                    await db.addDeal({exch: exch.name, profit: profit, type: 1, coin: coin, base: base})
                    console.log(`${coin}1: ${base} ${profit.toFixed(2)} : 100USDT => ${amountC.toFixed(4)}${coin} => ${amountB.toFixed(4)}${base} => ${(amountB * m[base + '/USDT'].bid).toFixed(2)}USDT`)
    
                }
            } 

            amountB     = 100 / m[base + '/USDT'].ask
            amountC     = amountB / m[coin + '/' + base].ask
            profit      = amountC * m[coin + '/USDT'].bid - (3 * 0.1) - 100

            if (profit > 0.3 && profit < 10) {
                const avg1 = await avgTrade(exch, base + "/USDT", 50, "asks")
                const avg2 = await avgTrade(exch, coin + "/" + base, 50 / m[coin + '/' + base].ask, "asks")
                const avg3 = await avgTrade(exch, coin + '/USDT', 50, "bids")
                profit     = (100/avg1/avg2*avg3) - 0.3 - 100
                if (profit > 0.3) {
                    console.log(avg1, avg2, avg3, profit.toFixed(2))
                    await db.addDeal({exch: exch.name, profit: profit, type: 2, coin: coin, base: base})
                    console.log(`${coin}2: ${base} ${profit.toFixed(2)} : 100USDT => ${amountB.toFixed(4)}${base} => ${amountC.toFixed(4)}${coin} => ${(amountC * m[coin + '/USDT'].bid).toFixed(2)}USDT`)
                }
            }

        }
        

        

    }
    console.log(`${exch.name} ended in ${(new Date() - starttime)/1000} sec || pairsCount=${pairsCount} coinsCount=${coinsCount}`)
}
async function marketLoop() {
    while(true) {
        for (var i=0; i<exch.length; i++) {
            await market(exch[i])
        }
    }
}
marketLoop()