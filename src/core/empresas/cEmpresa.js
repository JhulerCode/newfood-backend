import { EmpresaRepository, SucursalRepository } from '#db/repositories.js'
import { minioPutObject, minioRemoveObject } from '#infrastructure/minioClient.js'
import { resDeleteFalse, resUpdateFalse } from '#http/helpers.js'
import { arrayMap } from '#store/system.js'
import { actualizarEmpresa, borrarEmpresa, guardarEmpresa } from '#store/empresas.js'
import { borrarSucursal, guardarSucursal } from '#store/sucursales.js'

const feature_ids = [
    'pedidos',
    'pos',
    'mesas',
    'delivery',
    'para_llevar',
    'insumos',
    'recetas',
    'areas_impresion',
]

function normalizeFeatures(features) {
    const normalized_features = {}

    for (const feature_id of feature_ids) {
        normalized_features[feature_id] = features?.[feature_id] === true
    }

    return normalized_features
}

function isAdminUser(req) {
    return req.user?.permisos?.some((permiso) => permiso.startsWith('vTenants:')) == true
}

function getEmpresaPayload(body, include_admin_fields = false) {
    const payload = {
        nombre_comercial: body.nombre_comercial,
        domicilio_fiscal: body.domicilio_fiscal,
        ubigeo: body.ubigeo,
        igv_porcentaje: body.igv_porcentaje,
        telefono: body.telefono,
        correo: body.correo,
        foto: body.foto,
    }

    if (include_admin_fields) {
        payload.tipo = body.tipo
        payload.ruc = body.ruc
        payload.razon_social = body.razon_social
        payload.subdominio = body.subdominio
        payload.activo = body.activo === true
        payload.features = normalizeFeatures(body.features)
    }

    return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
}

async function syncSucursales(empresa_id, sucursales = [], colaborador) {
    const actuales = await SucursalRepository.find(
        { fltr: { empresa: { op: 'Es', val: empresa_id } }, cols: { exclude: [] } },
        true,
    )
    const enviados_ids = sucursales.filter((sucursal) => sucursal.id).map((sucursal) => sucursal.id)

    for (const actual of actuales) {
        if (!enviados_ids.includes(actual.id)) {
            await SucursalRepository.delete({ id: actual.id })
            borrarSucursal(actual.id)
        }
    }

    for (const sucursal of sucursales) {
        const data = {
            codigo: sucursal.codigo,
            direccion: sucursal.direccion,
            telefono: sucursal.telefono,
            correo: sucursal.correo,
            activo: sucursal.activo === true,
            empresa: empresa_id,
        }

        if (sucursal.id) {
            await SucursalRepository.update(
                { id: sucursal.id, empresa: empresa_id },
                { ...data, updatedBy: colaborador },
            )
            guardarSucursal(sucursal.id, { id: sucursal.id, ...data })
        } else {
            const nuevo = await SucursalRepository.create({ ...data, createdBy: colaborador })
            guardarSucursal(nuevo.id, nuevo.toJSON())
        }
    }
}

async function loadOne(id) {
    const data = await EmpresaRepository.find({ id, cols: { exclude: [] } }, true)
    if (!data) return null

    data.sucursales = await SucursalRepository.find(
        {
            fltr: { empresa: { op: 'Es', val: id } },
            cols: { exclude: [] },
            ordr: [['codigo', 'ASC']],
        },
        true,
    )

    const activo_estadosMap = arrayMap('activo_estados')
    data.activo1 = activo_estadosMap[data.activo]
    for (const sucursal of data.sucursales) sucursal.activo1 = activo_estadosMap[sucursal.activo]

    return data
}

const find = async (req, res) => {
    try {
        const qry = req.query.qry ? JSON.parse(req.query.qry) : null

        if (!isAdminUser(req)) return res.status(403).json({ msg: 'Acceso denegado' })

        // qry.fltr.empresa = { op: 'Es', val: empresa }

        let data = await EmpresaRepository.find(qry, true)

        // if (data.length > 0) {
        //     const activo_estadosMap = arrayMap('activo_estados')

        //     for (const a of data) {
        //         if (qry?.cols?.includes('activo')) a.activo1 = activo_estadosMap[a.activo]
        //     }
        // }

        const activo_estadosMap = arrayMap('activo_estados')
        for (const item of data) item.activo1 = activo_estadosMap[item.activo]

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const findById = async (req, res) => {
    try {
        const { id } = req.params
        const can_admin = isAdminUser(req)
        const data = can_admin ? await loadOne(id) : req.empresa

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

        const can_admin = isAdminUser(req)
        if (!can_admin && id != req.user.empresa) {
            return res.status(403).json({ msg: 'Acceso denegado' })
        }

        if (can_admin) {
            if (
                (await EmpresaRepository.existe(
                    { ruc: req.body.ruc, id },
                    res,
                    'El RUC ya existe',
                )) == true
            ) {
                return
            }
            if (
                (await EmpresaRepository.existe(
                    { subdominio: req.body.subdominio, id },
                    res,
                    'El subdominio ya existe',
                )) == true
            ) {
                return
            }
        }

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
            ...getEmpresaPayload(req.body, can_admin),
            foto: newFile || req.body.foto,
            updatedBy: colaborador,
        }

        // ----- ACTUALIZAR ----- //
        const updated = await EmpresaRepository.update({ id }, send)

        if (updated == false) return resUpdateFalse(res)

        //--- Eliminar archivo de minio ---//
        if (req.file && req.body.foto?.id) await minioRemoveObject(req.body.foto.id)

        if (can_admin) await syncSucursales(id, req.body.sucursales || [], colaborador)

        const data = await loadOne(id)
        actualizarEmpresa(id, data)

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const create = async (req, res) => {
    try {
        const { colaborador } = req.user
        const send = {
            ...getEmpresaPayload(req.body, true),
            features: normalizeFeatures(req.body.features),
        }

        if ((await EmpresaRepository.existe({ ruc: send.ruc }, res, 'El RUC ya existe')) == true) {
            return
        }
        if (
            (await EmpresaRepository.existe(
                { subdominio: send.subdominio },
                res,
                'El subdominio ya existe',
            )) == true
        ) {
            return
        }

        const nuevo = await EmpresaRepository.create(send)
        await syncSucursales(nuevo.id, req.body.sucursales || [], colaborador)

        const data = await loadOne(nuevo.id)
        guardarEmpresa(nuevo.id, data)

        res.json({ code: 0, data })
    } catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

const delet = async (req, res) => {
    try {
        const { id } = req.params

        const sucursales = await SucursalRepository.find(
            { fltr: { empresa: { op: 'Es', val: id } }, cols: ['id'] },
            true,
        )
        for (const sucursal of sucursales) {
            await SucursalRepository.delete({ id: sucursal.id })
            borrarSucursal(sucursal.id)
        }

        if ((await EmpresaRepository.delete({ id })) == false) return resDeleteFalse(res)

        borrarEmpresa(id)

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
    find,
    findById,
    create,
    update,
    delet,
    // updateCdt
}
