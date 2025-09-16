import fs from "fs";
import { SignedXml } from "xml-crypto"
import path from "path"
import { fileURLToPath } from 'url'

// --- Definir ruta --- //
function setRuta(fileName) {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const carpeta = path.join(__dirname, '..', '..', '..', 'sunat', 'xml')
    return path.join(carpeta, fileName)
}

function setRuta2(fileName) {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const carpeta = path.join(__dirname, '..', '..', '..', 'sunat')
    return path.join(carpeta, fileName)
}

// --- Leer XML --- //
function leerXml(fileName) {
    try {
        return fs.readFileSync(setRuta(fileName), "utf8");
    } catch (err) {
        throw new Error(`Error leyendo XML: ${err.message}`);
    }
}

export function firmarXml(fileName) {
    try {
        // 1️⃣ Leer XML
        const unsignedXml = leerXml(fileName)

        const options = {
            publicCert: fs.readFileSync(setRuta2("cert.pem"), "utf8"),
            privateKey: fs.readFileSync(setRuta2("private_key.pem")),
            // signatureAlgorithm: "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
            signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
            canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
        };

        var sig = new SignedXml(options);

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

        fs.writeFileSync(setRuta(fileName), sig.getSignedXml(), "utf8")
    } catch (err) {
        console.error("❌ Error al firmar XML:", err.message)
        throw err
    }
}