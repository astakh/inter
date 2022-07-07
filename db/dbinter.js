const { exchanges } = require('ccxt');
const mongodb       = require('mongodb');
const mongoose      = require('mongoose'); 
const func          = require('../functions');
const {Coin}        = require('../models/Coins')
const {Deal}        = require('../models/Deals')
//const {Deal}        = require('../models/Deals');
//const { Log }       = require('./Logs');
require('dotenv').config()

const db            = process.env.DBPATH; 
mongoose
.connect(db)
.then((res) => console.log('Connected to DB'))
.catch((err) => console.log(err));

async function addCoin(par) {
    const c = new Coin(par)
    await c.save()
}

async function getBots() {
    try {
        const bots = Bot.find({active: true})
        return bots
    } catch(err) { console.log(err); return false; }
}

async function addMask() {
    let params      = {}
    params.active   = false
    params.name     = 'Anton2_43_30'
    params.stage    = 0
    params.amount   = 30
    params.waiting  = 'sell'
    params.range    = {sell: 0.43, buy: 0.30}
    params.orderMask= {
        sell: {
            left:   {direction: 'sell', pair: 'WAVES/USDT'},
            right:  {direction: 'buy',  pair: 'WAVES/USDN'}
        },
        buy: {
            left:   {direction: 'buy',  pair: 'WAVES/USDT'},
            right:  {direction: 'sell', pair: 'WAVES/USDN'}
        },
        rebal: {
            right:  {direction: 'sell', pair: 'USDT/USDN'}
        }
    }
    params.orders   = {
        sell:   {left: {orderId: '', placed: false, closed: false, average: 0}, right: {orderId: '', placed: false, closed: false, average: 0}},
        buy:    {left: {orderId: '', placed: false, closed: false, average: 0}, right: {orderId: '', placed: false, closed: false, average: 0}}
    }
    params.exchanges= {left: 'binance', right: 'wavesexchange', ccxt: {left: '', right: ''}}
    params.coins    = {
        left: {
            coin:   'WAVES',
            base:   'USDT',
            pair:   'WAVES/USDT'
        }, 
        right: {
            coin:   'WAVES',
            base:   'USDN',
            pair:   'WAVES/USDN'
        } 
    }
    params.dealId   = ''
    params.profit   = 0

    let mask    = new Mask(params);
    let bot     = new Bot(params);
    bot.maskId  = mask._id; 
    mask.maskId = mask._id; 
    bot.botId  = bot._id; 
    mask.botId = bot._id; 

    await bot.save(); 
    await mask.save();
    console.log(bot._id, 'bot created');
    console.log(mask._id, 'mask created');

    
}
async function addOrder(bot, orderId, side) {
    try {
        const b = await Bot.findById(bot.botId)
        let newOrders = b.orders
        newOrders[bot.waiting][side] = {orderId: orderId, placed: true, closed: false, average: 0}
        await Bot.updateOne({_id: bot.botId}, {orders: newOrders})
        await addLog(bot, `Order ${side} added`)
        return newOrders
    }
    catch(err) { console.log(err); return false}
}
async function setStage(bot, stage) {
    await Bot.updateOne({_id: bot.botId}, {stage: stage})
    await addLog(bot, `go to stage ${stage}`)
    return stage
}

async function updateOrder(bot, order, side) {
    try {
        const b = await Bot.findById(bot.botId)
        let newOrders = b.orders
        newOrders[bot.waiting][side] = {orderId: order.orderId, placed: true, closed: true, average: order.average}
        //func.sendAlert(`profit = ${bot.profit.toFixed(2)} + ${order.average.toFixed(2)} * ${order.amount.toFixed(2)} * ${order.inOut}`)
        bot.profit += order.average * order.amount * order.inOut
        bot.profit -= order.average * order.amount * (0.0005 + 0.00075) / 2
        await Bot.updateOne({_id: bot.botId}, {orders: newOrders, profit: bot.profit})
        await addLog(bot, `Order ${side} updated`)
        return newOrders
    }
    catch(err) { console.log(err); return false}
} 
async function addDeal(bot) {
    const deal = new Deal({botId: bot.botId})
    await deal.save()
    await Bot.updateOne({_id: bot.botId}, {dealId: deal._id})
    await addLog(bot, `${bot.name}: deal started`)
    func.sendAlert(`${bot.name}: deal started`)
    return deal._id
}

async function addLog(bot, text) {
    const log = new Log({botId: bot.botId, maskId: bot.maskId, dealId: bot.dealId, text: text})
    await log.save()
    console.log(text)
}
async function addDeal(p) {
    const d = new Deal(p)
    await d.save()
}
async function changeCoin(c, p) {
    await Coin.updateOne(c, {market: p})
}

module.exports.addLog       = addLog;
module.exports.addDeal      = addDeal
module.exports.setStage     = setStage;
module.exports.addMask      = addMask
module.exports.addDeal      = addDeal
module.exports.addOrder     = addOrder
module.exports.addCoin      = addCoin
module.exports.changeCoin   = changeCoin
module.exports.updateOrder  = updateOrder