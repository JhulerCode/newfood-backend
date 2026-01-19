import CryptoJS from 'crypto-js'

let whiteList = []

function encrypt(obj, key) {
    const jsonString = JSON.stringify(obj)
    const token = CryptoJS.AES.encrypt(jsonString, key).toString()

    return token
}

function decrypt(text, key) {
    const decrypted = CryptoJS.AES.decrypt(text, key).toString(CryptoJS.enc.Utf8)
    const obj = JSON.parse(decrypted)

    return obj
}

function sign(obj, key) {
    const jsonString = JSON.stringify(obj)
    const token = CryptoJS.AES.encrypt(jsonString, key).toString()

    whiteList.push(token)

    return token
}

function verify(text, key) {
    const i = whiteList.findIndex(a => a == text)
    if (i === -1) return false

    return decrypt(text, key)
}

export default {
    encrypt, decrypt,
    sign, verify
}