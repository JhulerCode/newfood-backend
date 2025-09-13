import fs from "fs";
import JSZip from "jszip";
import axios from "axios";
import { Builder, parseStringPromise } from "xml2js";
import path from "path"
import { fileURLToPath } from 'url'

const SUNAT_URL = "https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService"
const SUNAT_URL_PROD = "https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService"
const RUC = "20604051984"
const USUARIO = `${RUC}MODDATOS`
const CLAVE = "moddatos"

// --- Definir ruta --- //
function setRuta(fileName) {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const carpeta = path.join(__dirname, '..', '..', '..', 'sunat', 'xml')
    return path.join(carpeta, fileName)
}

// --- Leer XML firmado --- //
function leerXml(fileName) {
    try {
        return fs.readFileSync(setRuta(fileName), "utf8");
    } catch (err) {
        throw new Error(`Error leyendo XML: ${err.message}`);
    }
}

// --- Crear ZIP en base64 --- //
async function crearZip(xmlContent, fileName) {
    try {
        const zip = new JSZip();
        zip.file(fileName, xmlContent);
        const zipContent = await zip.generateAsync({ type: "nodebuffer" });
        return zipContent.toString("base64");
    } catch (err) {
        throw new Error(`Error creando ZIP: ${err.message}`);
    }
}

// --- Construir SOAP --- //
function construirSoap(fileName, zipB64) {
    try {
        const builder = new Builder({ headless: true });
        return builder.buildObject({
            "soapenv:Envelope": {
                $: {
                    "xmlns:soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
                    "xmlns:ser": "http://service.sunat.gob.pe",
                },
                "soapenv:Header": {},
                "soapenv:Body": {
                    "ser:sendBill": {
                        "fileName": fileName.replace(".xml", ".zip"),
                        "contentFile": zipB64,
                    },
                },
            },
        });
    } catch (err) {
        throw new Error(`Error construyendo SOAP: ${err.message}`);
    }
}

/** Enviar a SUNAT */
async function enviarSoap(soapXml) {
    try {
        return await axios.post(SUNAT_URL, soapXml, {
            headers: { "Content-Type": "text/xml; charset=utf-8" },
            auth: { username: USUARIO, password: CLAVE },
        });
    } catch (err) {
        throw new Error(`Error enviando a SUNAT: ${err.response?.data || err.message}`);
    }
}

/** Procesar respuesta SUNAT */
async function procesarRespuesta(xmlResponse) {
    try {
        // 1️⃣ Extraer Base64 del CDR
        const match = xmlResponse.match(/<applicationResponse>([\s\S]*?)<\/applicationResponse>/);

        if (match) {
            const base64Cdr = match[1];
            const cdrZipBuffer = Buffer.from(base64Cdr, "base64");

            // 2️⃣ Descomprimir ZIP
            const zip = await JSZip.loadAsync(cdrZipBuffer);
            const fileName = Object.keys(zip.files).find((n) => n.endsWith(".xml"));
            if (!fileName) throw new Error("No se encontró XML dentro del CDR ZIP");

            const cdrXml = await zip.files[fileName].async("string");

            // 3️⃣ Guardar en disco
            fs.writeFileSync(setRuta(fileName), cdrXml, "utf8");
            console.log("📄 Archivo CDR guardado:", fileName);

            // 4️⃣ Parsear CDR
            const cdrJson = await parseStringPromise(cdrXml, { explicitArray: false });

            const responseCode =
                cdrJson["ar:ApplicationResponse"]?.["cac:DocumentResponse"]?.["cac:Response"]?.["cbc:ResponseCode"];
            const description =
                cdrJson["ar:ApplicationResponse"]?.["cac:DocumentResponse"]?.["cac:Response"]?.["cbc:Description"];

            return { tipo: 'cdr', codigo: responseCode, descripcion: description };
        }
        else {
            const soapJson = await parseStringPromise(xmlResponse, { explicitArray: false });

            const fault = soapJson["soap-env:Envelope"]?.["soap-env:Body"]?.["soap-env:Fault"];
            if (!fault) throw new Error("No se encontró Fault en respuesta de SUNAT");
            console.log(fault)
            const codigo = fault.faultcode || fault["faultcode"];
            const mensaje = fault.faultstring || fault["faultstring"];

            return { tipo: "fault", codigo, descripcion: mensaje };
        }
    } catch (err) {
        throw new Error(`Error procesando respuesta de SUNAT: ${err.message}`);
    }
}

/** Orquestador */
export async function enviarSunat(fileName) {
    try {
        // 1️⃣ Leer XML
        const xmlContent = leerXml(fileName);

        // 2️⃣ ZIP en Base64
        const zipB64 = await crearZip(xmlContent, fileName);

        // 3️⃣ SOAP
        const soapXml = construirSoap(fileName, zipB64);

        // 4️⃣ Enviar a SUNAT
        const response = await enviarSoap(soapXml);
        console.log("✅ SUNAT respondió, procesando CDR...");

        // 5️⃣ Procesar respuesta
        const resultado = await procesarRespuesta(response.data);
        if (resultado.tipo == 'cdr') {
            console.log("✅ CDR JSON:", resultado);
            return resultado
        }
        else {
            console.log('❌ SUNAT respondió:', resultado)
            return resultado
        }
    } catch (err) {
        console.error("❌ Error en enviarFactura:", err.message);
        return null;
    }
}