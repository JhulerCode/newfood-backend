import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsPath = path.join(__dirname, '..', 'uploads')

function saveFile(file, name) {
    if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true })

    const tipoArchivo = file.split(';')[0].split('/')[1]

    const nombreArchivo = name ?
        `${name}.${tipoArchivo}` :
        Date.now() +''+ Math.floor(Math.random() * 1000) + '.' + tipoArchivo
    const filePath = path.join(uploadsPath, nombreArchivo)

    const base64DataSinEncabezado = file.replace(/^data:[^;]+;base64,/, '')
    const datosBinarios = Buffer.from(base64DataSinEncabezado, 'base64')

    fs.writeFileSync(filePath, datosBinarios)

    return nombreArchivo
}

function deleteFile(name){
    try {
        fs.unlinkSync(path.join(uploadsPath, name))
    }
    catch (error) {
        console.log(error)
    }
}

export {
    __dirname,
    uploadsPath,
    saveFile,
    deleteFile
}