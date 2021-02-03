const mongoose = require("mongoose");
const uniqeValidator = require("mongoose-unique-validator");

const couponCodes = new mongoose.Schema({
    name: { type: String},
    value: {type:Number},
    isPercentage:{type:Boolean},
    isConcat:{type:Boolean}

});

couponCodes.plugin(uniqeValidator);

module.exports = mongoose.model("PromoCode", couponCodes);
