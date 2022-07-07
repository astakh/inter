const ccxt      = require ('ccxt');
const axios     = require ('axios')
const db        = require('./db/dbinter')
const WebSocket = require('ws')
const func      = require('./functions');
const { Coin } = require('./models/Coins');
require('dotenv').config()

const exch = new ccxt.yobit(         { apiKey: '599C568AD229EFD4EA8D6B247F654C07',  secret: 'fa3f6e63118b7995e8caf25d8958bd7a' })
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
async function market () {
    const m = await exch.fetchTickers()
    const pairs = Object.keys(m) 
    for (var i=0; i<pairs.length; i++) { 
        const pair  = pairs[i].split('/')
        const coin = pair[0]
        const base = pair[1]
        if (base == 'BNB' || base == 'BTC' || base == 'ETH' || base == 'USDT' || base == 'USDC' || base == 'BUSD') {
            const c = await Coin.findOne({name: coin})
            if (c && m[coin + '/' + base] && m[base + '/USDT'] && m[coin + '/USDT']) {
                if (c && m[coin + '/' + base].ask>0 && m[base + '/USDT'].ask>0 && m[coin + '/USDT'].ask>0) {
                    let profit      = -100
                    let amountC     = 100 / m[coin + '/USDT'].bid
                    let amountB     = amountC * m[coin + '/' + base].bid
                    profit          += amountB * m[base + '/USDT'].bid - (3 * 0.1)

                    if (profit > 0) {
                        console.log(`${coin}1: ${base} ${profit.toFixed(2)} : ${m[coin + '/USDT'].ask}>${amountC}||${m[coin + '/' + base].bid}>${amountB}||${m[base + '/USDT'].bid}`)
                    }

                    profit      = -100
                    amountB     = 100 / m[base + '/USDT'].bid
                    amountC     = amountB / m[coin + '/' + base].ask
                    profit     += amountC * m[coin + '/USDT'].bid //- (3 * 0.1)

                    if (profit > 0) {
                        console.log(`${coin}2: ${base} ${profit.toFixed(2)} : ${m[base + '/USDT'].ask}>${amountB}||${m[coin + '/' + base].ask}>${amountC}||${m[coin + '/USDT'].bid}`)
                    }

                }
            }

        }

    }
    console.log('end')
}
market()