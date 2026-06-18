const CryptoJS =
    require("crypto-js");

function encryptMessage(
    text
) {

    return CryptoJS.AES.encrypt(

        text,

        process.env
            .AES_SECRET_KEY

    ).toString();
}

function decryptMessage(
    encryptedText
) {

    const bytes =

        CryptoJS.AES.decrypt(

            encryptedText,

            process.env
                .AES_SECRET_KEY
        );

    return bytes.toString(

        CryptoJS.enc.Utf8
    );
}

module.exports = {

    encryptMessage,

    decryptMessage,
};