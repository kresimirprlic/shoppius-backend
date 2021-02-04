const HttpError = require("../model/http-error");
const { validationResult } = require("express-validator");
const ShoppiusInventory = require("../model/shoppius-inventory");
const ShoppiusCart = require("../model/shoppius-cart");
const PromoCodes = require("../model/shoppius-cuponCodes");

////////////////////////////
//Get all inventory items
////////////////////////////
const getInventory = async (req, res, next) => {
	let inventory;
	try {
		inventory = await ShoppiusInventory.find({});
	} catch (error) {
		console.log("shoppius controller [getInventory]: ", error);
		return next(new HttpError("Fetching inventory failed, try again later.", 500));
	}
	res.status(200).json({ inventory });
};
////////////////////////////
//Get current cart items
////////////////////////////
const getCart = async (req, res, next) => {
	let cart;
	try {
		cart = await ShoppiusCart.find({});
	} catch (error) {
		console.log("shoppius controller [getCart]: ", error);
		return next(new HttpError("Fetching cart failed, try again later.", 500));
	}
	res.status(200).json({ cart });
};

////////////////////////////
//Helper methods
////////////////////////////
const calculateTotalHelperX = (cart) => {
	let totalSum = 0;
	cart.items.forEach((item) => {
		//find "raw" total for item in the cart 
		let tempTotal = item.price * item.quantity; 
		//get "quantity discount" for item
		if (item.qtyForDiscount !== 0) {
			const eligibleQtyForDiscount = Math.floor(item.quantity / item.qtyForDiscount);
			//apply quantity discount
			tempTotal -= (eligibleQtyForDiscount * item.discountValue);
		}
		totalSum += tempTotal;
	});
	return totalSum;
};

const calculateTotalHelper = (cart) => {
	let totalSum = 0;
	cart.items.forEach((item) => {
		itemSum = 0;
		let validForDiscount;
		if (item.qtyForDiscount !== 0 && item.qtyForDiscount > 0) {
			validForDiscount = Math.floor(item.quantity/item.qtyForDiscount); // (4/3  = 1), (1/3 = 0)
			console.log("valid for discount = ", validForDiscount)
		}else{
			validForDiscount = 0;
		}
		itemSum = ((validForDiscount*item.discountValue) + ( (item.quantity - (validForDiscount * item.qtyForDiscount)) * item.price));
		totalSum += itemSum;
		console.log("item sum = ", itemSum)
	}); 
	console.log("total sum = ", totalSum)
	return totalSum;
};

////////////////////////////
//Add item to cart
////////////////////////////
const addToCart = async (req, res, next) => {
	const { itemId } = req.body;
	//get cart from db
	let cart;
	try {
		cart = await ShoppiusCart.findOne({});
		// console.log("cart -> ", cart);
	} catch (error) {
		console.log("shoppius controller [getCart]: ", error);
		return next(new HttpError("Fetching cart failed, try again later.", 500));
	}
	//initialize cart if it is not existing
	if (!cart) {
		console.log("creating new cart");
		const newCart = new ShoppiusCart({
			items: [],
			total: 0,
			appliedCodes: [],
		});
		try {
			await newCart.save();
		} catch (error) {
			console.log("error [create cart] ->", error);
			return next(new HttpError("Error while creating cart in the database.", 500));
		}
	}
	// find item in inventory by id
	let inventoryItem;
	try {
		inventoryItem = await ShoppiusInventory.findById(itemId);
	} catch (error) {
		console.log("shoppius controller [getInventoryItem]: ", error);
		return next(new HttpError("Fetching inventory item failed, try again later.", 500));
	}

	//check if we have existing item in the cart
	const foundItem = cart.items.find((el) => el.itemId === itemId);

	//if item is not in cart already
	if (!foundItem) {
		console.log("no item was found");
		const newItem = {
			itemId,
			quantity: 1,
			price: inventoryItem.price,
			name: inventoryItem.name,
			qtyForDiscount: inventoryItem.qtyForDiscount,
			discountValue: inventoryItem.discountValue,
		};
		//add to cart
		cart.items.push(newItem);
		// console.log("cart.items", cart.items);
		// //calculate total
		cart.total = calculateTotalHelper(cart);

		//if item is already in cart increase the qty
	} else {
		console.log("item was found -> ", foundItem);
		//update quantity
		foundItem.quantity += 1;
		//calculate total
		cart.total = calculateTotalHelper(cart);
		cart.markModified("items");
	}
	//save
	try {
		await cart.save();
	} catch (error) {
		console.log("error [cart.save] ->", error);
		return next(new HttpError("Error while saving new cart item in the database.", 500));
	}
	res.status(200).json({ cart });
};

////////////////////////////
//Remove an item from cart
////////////////////////////
const removeFromCart = async (req, res, next) => {
	const { itemId } = req.body;

	let cart;
	try {
		cart = await ShoppiusCart.findOne({});
		// console.log("cart - ", cart);
	} catch (error) {
		console.log("shoppius controller [getCart]: ", error);
		return next(new HttpError("Fetching cart item failed, try again later.", 500));
	}

	//find item in the cart
	const foundItem = cart.items.find((el) => el.itemId === itemId);
	console.log("found item ->", foundItem);
	//remove item from cart
	//if qty > 1, reduce by 1
	if (foundItem && foundItem.quantity > 1) {
		foundItem.quantity -= 1;
		cart.markModified("items");
		//calculate total
		cart.total = calculateTotalHelper(cart);
		//if qty === 1, remove item
	} else if (foundItem && foundItem.quantity === 1) {
		const newItemsArray = cart.items.filter((el) => el.itemId !== itemId);
		cart.items = newItemsArray;
		cart.markModified("items");
		//calculate total
		cart.total = calculateTotalHelper(cart);
	} else {
		//do nothing
	}
	//save
	try {
		await cart.save();
	} catch (error) {
		console.log("error [update cart item] ->", error);
		return next(
			new HttpError("Error while removing quantity from an item in the database.", 500),
		);
	}
	res.status(200).json({ cart });
};

////////////////////////////
//Apply new cupon code
////////////////////////////
const applyCuponCode = async (req, res, next) => {
	//logic which promo codes can be combined
	const { codeName } = req.body;
	//get cart
	let cart;
	try {
		cart = await ShoppiusCart.findOne({});
		// console.log("cart- ", cart);
	} catch (error) {
		console.log("shoppius controller - applyCuponCode [getCart]: ", error);
		return next(new HttpError("Fetching cart item failed, try again later.", 500));
	}

	//get coupon codes arr from db
	let promoCodes;
	try {
		promoCodes = await PromoCodes.find({});
		// console.log("promo codes -> ", promoCodes)
	} catch (error) {
		console.log("shoppius controller - promoCodes [promoCodes]: ", error);
		return next(new HttpError("Fetching cart item failed, try again later.", 500));
	}

	const foundPromoCode = promoCodes.find((item) => item.name === codeName);
	// console.log("foundPromoCode ->", foundPromoCode);
	if (!foundPromoCode) {
		return next(new HttpError("Entered promo code is not recognized.", 500));
	}

	//////////////////Logic for updating cart's "appliedCodes:[]"/////////////////////////
	//check if non-concat promo code can be added to cart
	//(e.g. if one is already applied)
	for (const element of cart.appliedCodes) {
		if (!element.isConcat) {
			return next(new HttpError("You have already applied our BEST promo code.", 500));
		}
	}
	//if no codes are applied at all
	if (cart.appliedCodes.length === 0 && foundPromoCode) {
		cart.appliedCodes.push(foundPromoCode);
		cart.markModified("appliedCodes");

		//if there is already promo code applied
	} else if (cart.appliedCodes.length > 0 && foundPromoCode) {
		if (foundPromoCode.isConcat) {
			cart.appliedCodes.push(foundPromoCode);
			cart.markModified("appliedCodes");
		} else {
			return next(new HttpError("Entered promo code cannot be combined with other codes.", 500));
		}
	} else {
		//do nothing
	}

	//TODO - modifying cart's total in db according applied promo codes will not happen here in this step
	//Instead we will add coupon code to array, and caluclate new total on FE (only for user display)
	//later in an actual payment step, promo codes will be included in final calcualation
	//e.g. cleaner separation of concerns -> cart values vs. applied code values <- are not mixed in one total
	let newTotal = cart.total;
	//first apply "value" codes (e.g. 20EUROFF)
	cart.appliedCodes.filter(code => !code.isPercentage).forEach((element) => {
		newTotal -= element.value;
	});
	//then apply percantage codes (e.g. 5%OFF)
	cart.appliedCodes.filter(code => code.isPercentage).forEach((element) => {
		newTotal *= ((100 - element.value) / 100);
	});
	console.log("calculated new total ->", newTotal);

	// TODO - if price < 0, remove all coupon codes?

	//save
	try {
		await cart.save();
	} catch (error) {
		console.log("error [apply promo code] ->", error);
		return next(new HttpError("Error while applying promo code.", 500));
	}
	res.status(200).json({ cart });
};

////////////////////////////
//remove all applied coupons
////////////////////////////
const removeAppliedCuponCodes = async (req, res, next) => {
	//get cart
	let cart;
	try {
		cart = await ShoppiusCart.findOne({});
	} catch (error) {
		console.log("shoppius controller - applyCuponCode [getCart]: ", error);
		return next(new HttpError("Fetching cart failed, try again later.", 500));
	}
	//update
	cart.appliedCodes = [];

	//save
	try {
		await cart.save();
	} catch (error) {
		console.log("error [update cart item] ->", error);
		return next(new HttpError("Error while removing cart item in the database.", 500));
	}
	res.status(200).json({ cart });
};

////////////////////////////
//clears shopping cart
////////////////////////////
const clearShoppingCart = async (req, res, next) => {
	//get cart
	let cart;
	try {
		cart = await ShoppiusCart.findOne({});
	} catch (error) {
		console.log("shoppius controller - clearShoppingCart [getCart]: ", error);
		return next(new HttpError("Fetching cart item failed, try again later.", 500));
	}
	//update (delete)
	cart.items = [];
	cart.total = 0;
	cart.appliedCodes = [];

	//save
	try {
		await cart.save();
	} catch (error) {
		console.log("error clearShoppingCart [update cart] ->", error);
		return next(new HttpError("Error while removing cart item in the database.", 500));
	}
	res.status(200).json({ cart });
};

exports.getInventory = getInventory;
exports.getCart = getCart;
exports.addToCart = addToCart;
exports.removeFromCart = removeFromCart;
exports.applyCuponCode = applyCuponCode;
exports.removeAppliedCuponCodes = removeAppliedCuponCodes;
exports.clearShoppingCart = clearShoppingCart;
