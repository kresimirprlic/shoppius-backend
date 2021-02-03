const express = require("express");
const shoppiusController = require("../controllers/shoppius");

const router = express.Router();

router.get("/inventory", shoppiusController.getInventory);
router.get("/cart", shoppiusController.getCart);
router.post("/cart", shoppiusController.addToCart);
router.put("/cart", shoppiusController.removeFromCart);
router.delete("/cart", shoppiusController.clearShoppingCart);

router.post("/coupon", shoppiusController.applyCuponCode);
router.delete("/coupon", shoppiusController.removeAppliedCuponCodes);



module.exports = router;