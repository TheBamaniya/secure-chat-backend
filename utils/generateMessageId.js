const crypto =
    require("crypto");

module.exports = () => {

    return crypto
        .randomBytes(16)
        .toString("hex");
};