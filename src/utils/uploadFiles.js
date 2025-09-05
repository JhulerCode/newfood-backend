import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
// import multer from 'multer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsPath = path.join(__dirname, '..', 'uploads')

// function saveFile(file, name) {
//     if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true })

//     const tipoArchivo = file.split(';')[0].split('/')[1]

//     const nombreArchivo = name ?
//         `${name}.${tipoArchivo}` :
//         Date.now() +''+ Math.floor(Math.random() * 1000) + '.' + tipoArchivo
//     const filePath = path.join(uploadsPath, nombreArchivo)

//     const base64DataSinEncabezado = file.replace(/^data:[^;]+;base64,/, '')
//     const datosBinarios = Buffer.from(base64DataSinEncabezado, 'base64')

//     fs.writeFileSync(filePath, datosBinarios)

//     return nombreArchivo
// }

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {

//         if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

//         cb(null, uploadsPath);
//     },
//     filename: (req, file, cb) => {
//         const timestamp = Date.now();
//         const uniqueName = `${timestamp}-${file.originalname}`;
//         cb(null, uniqueName);
//     }
// })

// const upload = multer({ storage })

function deleteFile(name) {
    try {
        fs.unlinkSync(path.join(uploadsPath, name))
    }
    catch (error) {
        console.log(error)
    }
}

function getFile(name) {
    const rutaArchivo = path.join(uploadsPath, name)

    return fs.existsSync(rutaArchivo)
}

function getFilePath(name) {
    return path.join(uploadsPath, name)
}

export {
    __dirname,
    uploadsPath,
    // upload,
    deleteFile,
    getFilePath,
    getFile
}