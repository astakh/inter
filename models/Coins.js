const { Schema, model } = require('mongoose');
const params = {
    name:       { type: String, },
    market:     { type: Object, }
} 

const coinSchema = new Schema (params, {timestamps: true}) 

module.exports.Coin = model('Coin', coinSchema)
