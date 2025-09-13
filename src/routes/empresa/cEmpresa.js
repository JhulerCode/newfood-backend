import { Empresa } from '../../database/models/Empresa.js'
import fs from "fs"
import forge from "node-forge"

const update = async (req, res) => {
    try {
        const { id } = req.params
        const { colaborador } = req.user
        const {
            ruc, razon_social, nombre_comercial,
            domicilio_fiscal, ubigeo,
            urbanizacion, distrito, provincia, departamento,
            telefono, correo,
            pc_principal_ip, igv_porcentaje,
        } = req.body

       // --- ACTUALIZAR --- //
        const [affectedRows] = await Empresa.update(
            {
                ruc, razon_social, nombre_comercial,
                domicilio_fiscal, ubigeo,
                urbanizacion, distrito, provincia, departamento,
                telefono, correo,
                pc_principal_ip, igv_porcentaje,
                updatedBy: colaborador
            },
            {
                where: { id },
            }
        )

        if (affectedRows > 0) {
            const data = await Empresa.findByPk('1')
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

const findById = async (req, res) => {
    try {
        const data = await Empresa.findByPk('1')

        res.json({ code: 0, data })
    }
    catch (error) {
        res.status(500).json({ code: -1, msg: error.message, error })
    }
}

function convertToPem() {
    // === 1. Cargar PFX ===
    const pfxData = fs.readFileSync("./certificado.pfx", "binary");
    const password = "2801";

    const p12Asn1 = forge.asn1.fromDer(pfxData);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    // === 2. Extraer clave y certificado ===
    let privateKeyPem, certificatePem;

    for (const safeContent of p12.safeContents) {
        for (const safeBag of safeContent.safeBags) {
            if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
                // Convertir clave a PKCS#8
                privateKeyPem = forge.pki.privateKeyInfoToPem(
                    forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(safeBag.key))
                )
                // Convertir clave a PKCS#1
                // privateKeyPem = forge.pki.privateKeyToPem(safeBag.key);
            } else if (safeBag.type === forge.pki.oids.certBag) {
                certificatePem = forge.pki.certificateToPem(safeBag.cert);
            }
        }
    }

    // === 3. Guardar archivos ===
    fs.writeFileSync("./private_key.pem", privateKeyPem);
    fs.writeFileSync("./cert.pem", certificatePem);

    console.log("✅ Clave y certificado extraídos correctamente");
}

export default {
    findById,
    update,
}