const jwt = require("jsonwebtoken");
const HttpError = require("../model/http-error");

module.exports = (req, res, next) => {

   if (req.method === "OPTIONS") {
      return next()
   }

   try {
      const token = req.headers.authorization.split(" ")[1];
      if (!token) {
         return next(new HttpError("Unauthorized access", 401))
      }
      //verify return a payload encoded in token
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

      if (!decodedToken.role.includes("isAuthorized")) {
         return next(new HttpError("Unathorized role status.", 401))
      }
      next();
   } catch (error) {
      console.log(error)
      return next(new HttpError("Unathorized", 401))
   }
}
