import { Op } from 'sequelize'

async function existe(model, where, res, ms) {
    if (where.id) {
        where.id = { [Op.not]: where.id }
    }

    const result = await model.findAll({ where })

    if (result.length > 0) {
        res.json({ code: 1, msg: ms ? ms : 'El nombre ya existe' })
        return true
    }
}

function applyFilters(filters = {}) {
    const whereClause = {};

    // procesar todo lo que no sea "or"
    Object.keys(filters).forEach((key) => {
        if (key !== "or") {
            const { op, val, val1 } = filters[key];
            whereClause[key] = buildCondition({ op, val, val1 });
        }
    });

    // procesar OR si existe
    if (filters.or && typeof filters.or === "object") {
        const orConditions = Object.entries(filters.or).map(([field, cond]) => {
            return { [field]: buildCondition(cond) };
        });

        if (orConditions.length > 0) {
            whereClause[Op.or] = orConditions;
        }
    }

    return whereClause;
}

function buildCondition({ op, val, val1 }) {
    switch (op) {
        case "Es": return val;
        case "No es": return { [Op.ne]: val };
        case "Contiene": return { [Op.iLike]: `%${val}%` };
        case "No contiene": return { [Op.notILike]: `%${val}%` };
        case "Empieza con": return { [Op.iLike]: `${val}%` };
        case "Termina con": return { [Op.iLike]: `%${val}` };
        case "Está vacío": return { [Op.is]: null };
        case "No está vacío": return { [Op.not]: null };
        case "Es anterior a": return { [Op.lt]: val };
        case "Es posterior a": return { [Op.gt]: val };
        case "Es igual o anterior a": return { [Op.lte]: val };
        case "Es igual o posterior a": return { [Op.gte]: val };
        case "Está dentro de": return { [Op.between]: [val, val1] };
        case "=": return val;
        case "!=": return { [Op.ne]: val };
        case "<": return { [Op.lt]: val };
        case ">": return { [Op.gt]: val };
        case "<=": return { [Op.lte]: val };
        case ">=": return { [Op.gte]: val };
        default: return val;
    }
}

function cleanFloat(num) {
    return Math.round((num + Number.EPSILON) * 1e12) / 1e12;
}

function redondear(num, dec = 2) {
    if (num === null || num === undefined) return num

    return Number(num).toLocaleString('en-US', {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec
    })
}

function numeroATexto(num) {
    const unidades = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
    const decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
    const especiales = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
    const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

    function convertir(n) {
        if (n < 10) return unidades[n];
        if (n < 20) return especiales[n - 10];
        if (n < 100) return decenas[Math.floor(n / 10)] + (n % 10 === 0 ? "" : " Y " + unidades[n % 10]);
        if (n < 1000) return (n === 100 ? "CIEN" : centenas[Math.floor(n / 100)]) + (n % 100 === 0 ? "" : " " + convertir(n % 100));
        if (n < 1000000) return (n < 2000 ? "MIL" : convertir(Math.floor(n / 1000)) + " MIL") + (n % 1000 === 0 ? "" : " " + convertir(n % 1000));
        if (n < 1000000000) return convertir(Math.floor(n / 1000000)) + " MILLONES" + (n % 1000000 === 0 ? "" : " " + convertir(n % 1000000));
        return "";
    }

    const parteEntera = Math.floor(num);
    const parteDecimal = Math.round((num - parteEntera) * 100);

    const textoEntero = convertir(parteEntera);
    const textoDecimal = parteDecimal < 10 ? "0" + parteDecimal : parteDecimal;

    return `${textoEntero} CON ${textoDecimal}/100`;
}

export {
    existe,
    applyFilters,
    cleanFloat,
    redondear,
    numeroATexto,
}