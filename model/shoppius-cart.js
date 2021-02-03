const mongoose = require("mongoose");
const uniqeValidator = require("mongoose-unique-validator");

const cartSchema = new mongoose.Schema({
	items: [
		// {
		//     itemId: {type: String},
		//     quantity: {type: Number},
		//     price: {type: Number},
		//     name: {type: String},
		//     qtyForDiscount: {type:Number},
		// discountValue:{type:Number}
		// }
	],
	total: { type: Number },
	appliedCodes: [],
});

cartSchema.plugin(uniqeValidator);

module.exports = mongoose.model("ShoppiusCart", cartSchema);
