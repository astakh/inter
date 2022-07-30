const { Schema, model } = require('mongoose');
const params = {
    type:       { type: Number, },
    exch:       { type: String, },
    coin:       { type: String, },
    base:       { type: String, },
    profit:     { type: Number, },
    order1:     { type: String, },
    order2:     { type: String, }
} 

const tradeSchema = new Schema (params, {timestamps: true}) 

module.exports.Trade = model('Trade', tradeSchema)