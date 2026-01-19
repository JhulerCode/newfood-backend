import { Empresa } from '#db/models/Empresa.js'
import { pathSunat, deleteFile } from '#shared/uploadFiles.js'
import path from "path"
import fs from "fs"
import forge from "node-forge"
import { actualizarSesion } from '../../store/sessions.js'
import { minioClient, minioDomain, minioBucket } from "../../infrastructure/minioClient.js"

const findById = async (req, res) => {
    try {
        const data = req.empresa

        res.json({ code: 0, data })
    }
    catch (error) {
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
            ruc, razon_social, nombre_comercial,
            domicilio_fiscal, ubigeo, distrito, provincia, departamento,
            telefono, correo, logo, previous_logo,
            igv_porcentaje, sol_usuario, sol_clave,
            pc_principal_ip,
        } = req.body

        // --- ACTUALIZAR --- //
        const send = {
            ruc, razon_social, nombre_comercial,
            domicilio_fiscal, ubigeo, distrito, provincia, departamento,
            telefono, correo, logo,
            igv_porcentaje, sol_usuario, sol_clave,
            pc_principal_ip,
            updatedBy: colaborador
        }

        if (req.file) {
            const timestamp = Date.now();
            const uniqueName = `${timestamp}-${req.file.originalname}`;

            // Subir a MinIO
            await minioClient.putObject(
                minioBucket,
                uniqueName,
                req.file.buffer,
                req.file.size,
                { "Content-Type": req.file.mimetype }
            );

            send.logo = uniqueName;

            // Borrar logo anterior del bucket si existe
            if (previous_logo && previous_logo !== uniqueName) {
                try {
                    await minioClient.removeObject(minioBucket, previous_logo);
                } catch (err) {
                    console.error("Error al borrar logo anterior:", err.message);
                }
            }

            // Generar URL pública HTTPS permanente
            const publicUrl = `https://${minioDomain}/${minioBucket}/${uniqueName}`;
            send.logo_url = publicUrl;
        }

        const [affectedRows] = await Empresa.update(send, { where: { id }, })

        if (affectedRows > 0) {
            actualizarSesion(id, { empresa: send })

            let data = await Empresa.findByPk(id, {
                attributes: { exclude: ['cdt', 'cdt_clave'] }
            })

            if (data) {
                data = data.toJSON()
                data.previous_logo = data.logo
                // data.logo_url = send.logo_url || null
                // data.logo_url = await minioClient.presignedUrl(
                //     "GET",
                //     minioBucket,
                //     data.logo,
                //     60 * 60 // 1 hora
                // );
            }

            res.json({ code: 0, data })
        }
        else {
            res.json({ code: 1, msg: 'No se actualizó ningún registro' })
        }
    }
    catch (error) {
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