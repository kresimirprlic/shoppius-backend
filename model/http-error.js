class HttpError extends Error {
    constructor(message, errorCode) {
        //we use super to forward message to "Error" base class we are extending
        super(message); //adds "message" property on the instance of this class we are creating
        this.code = errorCode; //adds a "code" property
    }
}

module.exports = HttpError;