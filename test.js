const ccxt      = require ('ccxt');
const axios     = require ('axios')
const db        = require('./db/dbinter')
const WebSocket = require('ws')
const func      = require('./functions');
const { Coin } = require('./models/Coins');
require('dotenv').config()

let exch = []
exch.push(new ccxt.binance( { apiKey: process.env.BINANCE_API_KEY,                  secret: process.env.BINANCE_API_SECRET }))
exch.push(new ccxt.gateio(  { apiKey: '99473726-03B8-43AB-A3FF-D7D97D657192',       secret: 'be1c1d3b56fe8b0b558e123b2bce5abdb3174d10797ceab52d6b5f094bdd5d49' }))
exch.push(new ccxt.kucoin(  { apiKey: '62c484053e5f050001576a62',                   secret: '64d8d248-85b6-46a7-b5da-ed9929cb2212' }))
exch.push(new ccxt.huobi(   { apiKey: 'ad6416cf-d0d7f9eb-vf25treb80-5c110',         secret: 'e950123e-abd87ef3-83dfb0cb-07d0f'  }))
exch.push(new ccxt.bibox(   { apiKey: '2ce9e88e6325cca8bc80d0229b26fd41643b1425',   secret: '462c1a837de2f69ee9adb5ce6032415ab08a8b47'  }))
exch.push(new ccxt.okx(     { apiKey: '3a8e181a-b2e5-4ec2-aaaf-49767d14cd0b',       secret: 'CB9CF926B0539EC8C901C3DFCCA63A47', password: 'okxDedperded999!' }))
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
async function market (exch) {
    console.log(exch.name)
    const m = await exch.fetchTickers()
    const pairs = Object.keys(m) 
    for (var i=0; i<pairs.length; i++) { 
        const pair  = pairs[i].split('/')
        const coin = pair[0]
        const base = pair[1]
        if (base == 'BNB' || base == 'BTC' || base == 'ETH' || base == 'USDT' || base == 'USDC' || base == 'BUSD') {
            const c = await Coin.findOne({name: coin})
            if (c && m[coin + '/' + base] && m[base + '/USDT'] && m[coin + '/USDT'] && coin != 'EPS') {
                if (c && m[coin + '/' + base].ask>0 && m[base + '/USDT'].ask>0 && m[coin + '/USDT'].ask>0) { 
                    let amountC     = 100 / m[coin + '/USDT'].ask
                    let amountB     = amountC * m[coin + '/' + base].bid
                    let profit      = amountB * m[base + '/USDT'].bid - (3 * 0.1) - 100

                    if (profit > 0.3) {
                        await db.addDeal({exch: exch.name, profit: profit, type: 1, coin: coin, base: base})
                        console.log(`${coin}1: ${base} ${profit.toFixed(2)} : ${m[coin + '/USDT'].ask}>${amountC}||${m[coin + '/' + base].bid}>${amountB}||${m[base + '/USDT'].bid}`)
                    } 

                    amountB     = 100 / m[base + '/USDT'].ask
                    amountC     = amountB / m[coin + '/' + base].ask
                    profit      = amountC * m[coin + '/USDT'].bid - (3 * 0.1) - 100

                    if (profit > 0.3) {
                        await db.addDeal({exch: exch.name, profit: profit, type: 2, coin: coin, base: base})
                        console.log(`${coin}2: ${base} ${profit.toFixed(2)} : ${m[base + '/USDT'].ask}>${amountB}||${m[coin + '/' + base].ask}>${amountC}||${m[coin + '/USDT'].bid}`)
                    }

                }
            }

        }

    }
    console.log('end')
}
async function marketLoop() {
    while(true) {
        for (var i=0; i<exch.length; i++) {
            await market(exch[i])
        }
    }
}
marketLoop()