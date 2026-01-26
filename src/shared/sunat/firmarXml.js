import fs from "fs";
import { pathXml, pathSunat } from '#shared/uploadFiles.js'
import path from "path"
import { SignedXml } from "xml-crypto"
import { DOMParser } from '@xmldom/xmldom'

// // --- Leer XML --- //
// function leerXml(fileName) {
//     try {
//         const ruta = path.join(pathXml, fileName)
//         return fs.readFileSync(ruta, "utf8")
//     } catch (err) {
//         throw new Error(`Error leyendo XML: ${err.message}`)
//     }
// }

export function firmarXml(fileName) {
    try {
        // 1️⃣ Leer XML
        // const unsignedXml = leerXml(fileName)
        const rutaUnsignedXml = path.join(pathXml, fileName)
        const unsignedXml = fs.readFileSync(rutaUnsignedXml, "utf8")
        const rutaCert = path.join(pathSunat, 'cert.pem')
        const rutaKey = path.join(pathSunat, 'private_key.pem')

        const options = {
            publicCert: fs.readFileSync(rutaCert, "utf8"),
            privateKey: fs.readFileSync(rutaKey),
            // signatureAlgorithm: "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
            signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
            canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
        };

        var sig = new SignedXml(options)

        sig.addReference({
            xpath: "/*[local-name(.)='Invoice']",
            transforms: [
                "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
                "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"
            ],
            // digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
            digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
            isEmptyUri: true
        });

        sig.computeSignature(unsignedXml, {
            prefix: 'ds',
            attrs: { Id: "SignJdCode" },
            location: {
                reference: "//*[local-name(.)='ExtensionContent']",
                action: "append",
            },
        });

        // --- XML firmado ---
        const signedXml = sig.getSignedXml()

        // --- Obtener solo el SignatureValue ---
        const doc = new DOMParser().parseFromString(signedXml, "application/xml")
        const signatureValue = doc.getElementsByTagName("ds:DigestValue")[0].textContent

        const ruta = path.join(pathXml, fileName)
        fs.writeFileSync(ruta, signedXml, "utf8")

        return signatureValue
    } catch (err) {
        console.error("❌ Error al firmar XML:", err.message)
        throw err
    }
}