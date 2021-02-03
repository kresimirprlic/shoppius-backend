const mongoose = require("mongoose");
const uniqeValidator = require("mongoose-unique-validator");

const inventorySchema = new mongoose.Schema({
    name: { type: String},
    desription:{type:String},
    image: { type: String},
    price:{type:Number},
    qtyForDiscount: {type:Number},
    discountValue:{type:Number}

});

inventorySchema.plugin(uniqeValidator);

module.exports = mongoose.model("ShoppiusInventory", inventorySchema);
