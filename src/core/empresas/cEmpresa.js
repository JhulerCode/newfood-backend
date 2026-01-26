import { EmpresaRepository } from '#db/repositories.js'
import { minioPutObject, minioRemoveObject } from '#infrastructure/minioClient.js'
import { resUpdateFalse } from '#http/helpers.js'
import { actualizarEmpresa } from '#store/empresas.js'

const findById = async (req, res) => {
    try {
        const data = req.empresa

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const update = async (req, res) => {
    try {
        const { colaborador } = req.user
        const { id } = req.params

        if (req.body.datos) {
            const datos = JSON.parse(req.body.datos)
            req.body = { ...datos }
        }

        const {
            razon_social,
            nombre_comercial,

            domicilio_fiscal,
            ubigeo,
            igv_porcentaje,

            telefono,
            correo,
            foto,

            subdominio,
        } = req.body

        //--- Subir archivo ---//
        let newFile
        if (req.file) {
            newFile = await minioPutObject(req.file)

            if (newFile == false) {
                res.status(500).json({ code: 1, msg: 'Error al subir el archivo' })
                return
            }
        }

        const send = {
            nombre_comercial,

            domicilio_fiscal,
            ubigeo,
            igv_porcentaje,

            telefono,
            correo,
            foto: newFile || foto,

            createdBy: colaborador,
        }

        // ----- ACTUALIZAR ----- //
        const updated = await EmpresaRepository.update({ id }, send)

        if (updated == false) return resUpdateFalse(res)

        //--- Eliminar archivo de minio ---//
        if (req.file) await minioRemoveObject(foto.id)

        actualizarEmpresa(subdominio, {id, razon_social, ...send})

        res.json({ code: 0 })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

// const updateCdt = async (req, res) => {
//     try {
//         const { colaborador } = req.user
//         const { id } = req.params

//         if (req.body.datos) {
//             const datos = JSON.parse(req.body.datos)
//             req.body = { ...datos }
//         }

//         const {
//             cdt, cdt_clave,
//         } = req.body

//         // --- ACTUALIZAR --- //
//         const send = {
//             cdt, cdt_clave,
//             updatedBy: colaborador
//         }

//         if (req.file) send.cdt = req.file.filename

//         const [affectedRows] = await Empresa.update(
//             send,
//             {
//                 where: { id },
//             }
//         )

//         if (affectedRows > 0) {
//             // if (send.cdt != previous_cdt && previous_cdt != null) {
//             //     deleteFile(previous_cdt)
//             // }
//             if (req.file) {
//                 convertToPem(req.file.filename)
//             }

//             res.json({ code: 0 })
//         }
//         else {
//             res.json({ code: 1, msg: 'No se actualizó ningún registro' })
//         }
//     }
//     catch (error) {
//         res.status(500).json({ code: -1, msg: error.message, error })
//     }
// }

// function convertToPem(fileName) {
//     // === 1. Cargar PFX ===
//     const ruta = path.join(pathSunat, fileName)
//     const pfxData = fs.readFileSync(ruta, "binary")
//     const password = "2801"

//     const p12Asn1 = forge.asn1.fromDer(pfxData)
//     const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password)

//     // === 2. Extraer clave y certificado ===
//     let privateKeyPem, certificatePem

//     for (const safeContent of p12.safeContents) {
//         for (const safeBag of safeContent.safeBags) {
//             if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
//                 // Convertir clave a PKCS#8
//                 privateKeyPem = forge.pki.privateKeyInfoToPem(
//                     forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(safeBag.key))
//                 )
//                 // Convertir clave a PKCS#1
//                 // privateKeyPem = forge.pki.privateKeyToPem(safeBag.key)
//             } else if (safeBag.type === forge.pki.oids.certBag) {
//                 certificatePem = forge.pki.certificateToPem(safeBag.cert)
//             }
//         }
//     }

//     // === 3. Guardar archivos ===
//     const rutaCert = path.join(pathSunat, './cert.pem')
//     const rutaKey = path.join(pathSunat, './private_key.pem')
//     fs.writeFileSync(rutaCert, certificatePem)
//     fs.writeFileSync(rutaKey, privateKeyPem)

//     console.log("✅ Clave y certificado extraídos correctamente")
// }

export default {
    findById,
    update,
    // updateCdt
}
