const express = require("express");
const bodyParser = require("body-parser");
const HttpError = require("./model/http-error");
require('dotenv').config()
const mongoose = require("mongoose")
const authRoutes = require("./routes/auth")

const shoppiusRoutes = require("./routes/shoppius")
const helmet = require("helmet")
const compression = require("compression")
const cors = require("cors");

const app = express();

app.use(cors());
app.use(helmet());
app.use(compression());

app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Origin, X-Requested-With, Accept, Authorization");
    next();
});
//

app.use("/api/auth", authRoutes);

app.use("/api/shoppius", shoppiusRoutes)

//

app.use((req, res, next) => {
    const error = new HttpError("Could not find this route.", 404);
    return next(error);
});

app.use((error, req, res, next) => {
    if (req.file) {
        fs.unlink(req.file.path,
            (err) => console.log(err));
    }
    //check if response has already been sent - if so just forward the error
    if (res.headerSent) {
        next(error)
    }
    //if we get past this means no response has been sent and we send it now:
    res.status(error.code || 500);
    res.json({ message: error.message || "An uknown error occured" })
});

mongoose.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.dus2j.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`,
    { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false })
    .then(() => {
        app.listen(process.env.PORT || 9007);
        console.log("connected")
    })
    .catch((error) => {
        console.log("Error [mongoose connect]: ", error)
    })