const { Schema, model } = require('mongoose');
const params = {
    profit:     { type: Number, },
    type:       { type: Number, },
    exch:       { type: String, },
    coin:       { type: String, },
    base:       { type: String, }
} 

const dealSchema = new Schema (params, {timestamps: true}) 

module.exports.Deal = model('Deal', dealSchema)