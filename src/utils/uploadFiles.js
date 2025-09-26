import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import multer from 'multer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const pathUploads = path.join(__dirname, '..', '..', 'uploads')
const pathSunat = path.join(__dirname, '..', '..', 'sunat')
const pathXml = path.join(__dirname, '..', '..', 'sunat', 'xml')

const storageUploads = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(pathUploads)) fs.mkdirSync(pathUploads, { recursive: true })
        cb(null, pathUploads)
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now()
        const uniqueName = `${timestamp}-${file.originalname}`
        cb(null, uniqueName)
    }
})

const storageSunat = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(pathSunat)) fs.mkdirSync(pathSunat, { recursive: true });
        cb(null, pathSunat);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueName);
    }
})

const upload = multer({ storage: storageUploads })
const uploadToSunat = multer({ storage: storageSunat })

function deleteFile(name) {
    try {
        fs.unlinkSync(path.join(pathUploads, name))
    }
    catch (error) {
        console.log(error)
    }
}

function existFile(name) {
    const rutaArchivo = path.join(pathUploads, name)

    return fs.existsSync(rutaArchivo)
}

function getFilePath(name) {
    return path.join(pathUploads, name)
}

export {
    __dirname,
    pathUploads,
    pathSunat,
    pathXml,

    upload,
    uploadToSunat,

    deleteFile,
    getFilePath,
    existFile,
}